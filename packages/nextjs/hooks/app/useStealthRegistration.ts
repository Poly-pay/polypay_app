"use client";

import { useCallback, useState } from "react";
import { type RegisterStealthKeysDto, getUmbraAddresses, isStealthSupportedChain } from "@polypay/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyPair, Umbra } from "@umbracash/umbra-js";
import { providers } from "ethers";
import { stealthKeys } from "~~/hooks/api/useStealthStatus";
import { stealthApi } from "~~/services/api";

// EIP-712 typed data accepted by StealthKeyRegistry.setStealthKeysOnBehalf.
// Domain + types must match the contract exactly; see Umbra source.
function buildSetKeysTypedData(
  chainId: number,
  verifyingContract: string,
  message: {
    registrant: string;
    spendingPubKeyPrefix: bigint;
    spendingPubKey: bigint;
    viewingPubKeyPrefix: bigint;
    viewingPubKey: bigint;
  },
) {
  return {
    domain: {
      name: "Umbra Stealth Key Registry",
      version: "1",
      chainId,
      verifyingContract,
    },
    types: {
      StealthKeys: [
        { name: "registrant", type: "address" },
        { name: "spendingPubKeyPrefix", type: "uint256" },
        { name: "spendingPubKey", type: "uint256" },
        { name: "viewingPubKeyPrefix", type: "uint256" },
        { name: "viewingPubKey", type: "uint256" },
      ],
    },
    primaryType: "StealthKeys" as const,
    message,
  };
}

interface RegisterArgs {
  chainId: number;
  rpcUrl: string;
  // window.ethereum-compatible provider (from RainbowKit / connected wallet).
  injectedProvider: unknown;
}

interface RegisterResult {
  txHash: string;
  walletAddress: string;
}

// Splits the compressed public key bytes returned by umbra-js into the
// (prefix, x-coord) pair that the registry stores. Umbra uses uint256 for the
// x-coord; prefix is 2 or 3 from the leading byte.
function splitCompressedPubKey(hex: string): {
  prefix: number;
  pubKey: string; // 0x-prefixed 32 bytes
} {
  // KeyPair.publicKeyHex returns 65-byte uncompressed (04 || X || Y). We need
  // the compressed form. umbra-js exposes `compressedPublicKey` but typings
  // are loose; reconstruct here for clarity.
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length !== 130) {
    throw new Error(`Unexpected public key length: ${clean.length}`);
  }
  const x = clean.slice(2, 66);
  const y = clean.slice(66, 130);
  const yLastByte = parseInt(y.slice(-2), 16);
  const prefix = yLastByte % 2 === 0 ? 2 : 3;
  return { prefix, pubKey: `0x${x}` };
}

export function useStealthRegistration() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"idle" | "deriving" | "signing" | "submitting">("idle");

  const mutation = useMutation({
    mutationFn: async ({ chainId, rpcUrl, injectedProvider }: RegisterArgs): Promise<RegisterResult> => {
      if (!isStealthSupportedChain(chainId)) {
        throw new Error("Stealth payments not available on this network");
      }

      setStep("deriving");
      const browserProvider = new providers.Web3Provider(injectedProvider as never);
      const signer = browserProvider.getSigner();
      const walletAddress = (await signer.getAddress()).toLowerCase();

      // Derive Umbra meta-address. This triggers a personal_sign of the
      // canonical Umbra message; the SDK splits the signature into two keys.
      const rpcProvider = new providers.JsonRpcProvider(rpcUrl, chainId);
      const umbra = new Umbra(rpcProvider, chainId);
      const { spendingKeyPair, viewingKeyPair } = await umbra.generatePrivateKeys(signer as never);

      const spending = splitCompressedPubKey((spendingKeyPair as KeyPair).publicKeyHex);
      const viewing = splitCompressedPubKey((viewingKeyPair as KeyPair).publicKeyHex);

      const { registry } = getUmbraAddresses(chainId);

      const message = {
        registrant: walletAddress,
        spendingPubKeyPrefix: BigInt(spending.prefix),
        spendingPubKey: BigInt(spending.pubKey),
        viewingPubKeyPrefix: BigInt(viewing.prefix),
        viewingPubKey: BigInt(viewing.pubKey),
      };
      const typedData = buildSetKeysTypedData(chainId, registry, message);

      setStep("signing");
      // ethers v5 uses _signTypedData; the underscore is intentional, the
      // EIP-712 API was experimental when v5 shipped.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = await (signer as any)._signTypedData(typedData.domain, typedData.types, typedData.message);

      setStep("submitting");
      const dto: RegisterStealthKeysDto = {
        walletAddress,
        spendingPubKeyPrefix: spending.prefix,
        spendingPubKey: spending.pubKey,
        viewingPubKeyPrefix: viewing.prefix,
        viewingPubKey: viewing.pubKey,
        signature,
      };
      const response = await stealthApi.register(dto);

      // Surface the new status everywhere that reads it (Transfer, Batch).
      await queryClient.invalidateQueries({
        queryKey: stealthKeys.status(walletAddress),
      });

      setStep("idle");
      return { txHash: response.txHash, walletAddress };
    },
    onError: () => {
      setStep("idle");
    },
  });

  const register = useCallback((args: RegisterArgs) => mutation.mutateAsync(args), [mutation]);

  return {
    register,
    step,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
}
