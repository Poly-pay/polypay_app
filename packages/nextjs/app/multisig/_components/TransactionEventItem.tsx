import { type FC } from "react";
import { Abi, Address as AddressType, DecodeFunctionDataReturnType, decodeFunctionData, formatEther } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

type TransactionEventItemProps = {
  txId: bigint;
  to: AddressType;
  value: bigint;
  data: `0x${string}`;
};

export const TransactionEventItem: FC<TransactionEventItemProps> = tx => {
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "MetaMultiSigWallet" });

  const txnData =
    contractInfo?.abi && tx.data
      ? decodeFunctionData({ abi: contractInfo.abi as Abi, data: tx.data })
      : ({} as DecodeFunctionDataReturnType);

  return (
    <div className="flex py-2 border-b border-secondary last:border-b-0 gap-4 w-full justify-between">
      <div className=""># {tx?.txId?.toString()}</div>
      <div className="flex gap-1">{txnData.functionName}</div>
      <div className="flex gap-1">
        To <Address address={tx?.to} />
      </div>
      <div>{formatEther(tx?.value)} Ξ</div>
      <div className="flex gap-1"></div>
    </div>
  );
};
