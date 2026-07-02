"use client";

import { useEffect } from "react";
import { ARC_TESTNET_CHAIN_ID } from "@polypay/shared";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { useAccount } from "wagmi";
import { Form, FormField, FormInput } from "~~/components/form";
import { Button } from "~~/components/ui/button";
import { useArcAuth } from "~~/hooks/app/arc/useArcAuth";
import { useArcCreateAccount } from "~~/hooks/app/arc/useArcCreateAccount";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useZodForm } from "~~/hooks/form";
import { CreateArcAccountFormData, createArcAccountSchema } from "~~/lib/form";
import { notification } from "~~/utils/scaffold-eth";

export default function ArcCreateAccountPage() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, login, isLoading: isLoggingIn } = useArcAuth();
  const { createAccount, isPending } = useArcCreateAccount();
  const { goToDashboard } = useAppRouter();

  const form = useZodForm({
    schema: createArcAccountSchema,
    defaultValues: {
      owners: [{ address: address ?? "" }],
      threshold: 1,
    },
  });

  const { control, watch, setValue, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "owners" });
  const owners = watch("owners");

  // Pre-fill the first owner with the connected wallet address once available.
  useEffect(() => {
    if (address && !owners?.[0]?.address) {
      setValue("owners.0.address", address);
    }
  }, [address, owners, setValue]);

  const handleAddOwner = () => append({ address: "" });

  const handleRemoveOwner = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);
  };

  const onSubmit = async (data: CreateArcAccountFormData) => {
    try {
      const account = await createAccount(
        data.owners.map(o => o.address),
        data.threshold,
        ARC_TESTNET_CHAIN_ID,
      );
      reset({ owners: [{ address: address ?? "" }], threshold: 1 });
      goToDashboard();
      return account;
    } catch {
      // Errors are already surfaced via notification in useArcCreateAccount.
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 bg-white rounded-lg border border-divider">
        <p className="text-text-secondary text-base">Connect your wallet to create an Arc multisig account.</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 bg-white rounded-lg border border-divider">
        <p className="text-text-secondary text-base">Sign in with your wallet to continue.</p>
        <Button
          onClick={async () => {
            const ok = await login();
            if (!ok) {
              notification.error("Arc sign-in failed. Please try again.");
            }
          }}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? "Signing in..." : "Sign in with wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-white rounded-lg border border-divider p-6 gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary uppercase">Create Arc multisig</h1>
        <p className="text-sm text-text-secondary mt-1">Circle Arc testnet - ECDSA multisig (non-private).</p>
      </div>

      <div className="rounded-[16px] border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
        Non-private - signer addresses are public on Arc, unlike PolyPay&apos;s ZK multisig on other chains.
      </div>

      <Form form={form} onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-text-secondary text-base font-medium">Owners</div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <FormField<CreateArcAccountFormData> name={`owners.${index}.address`}>
                  {({ field: inputField }) => (
                    <FormInput
                      {...inputField}
                      placeholder="0x owner address"
                      disabled={index === 0}
                      name={`owners.${index}.address`}
                    />
                  )}
                </FormField>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveOwner(index)}
                disabled={fields.length <= 1 || index === 0}
                className="mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddOwner}
            className="flex items-center gap-2 text-white bg-violet-300 hover:bg-violet-300/80 px-3 py-1 rounded-[8px] transition-colors w-fit self-end"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Add owner</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-text-secondary text-base font-medium">Threshold</div>
          <div className="flex items-center gap-3">
            <FormField<CreateArcAccountFormData> name="threshold">
              {({ field: thresholdField }) => (
                <FormInput
                  {...thresholdField}
                  type="number"
                  min={1}
                  max={owners?.length || 1}
                  className="w-[160px]"
                  onChange={e => thresholdField.onChange(Number(e.target.value))}
                  name="threshold"
                />
              )}
            </FormField>
            <span className="text-text-secondary text-sm">/ out of {owners?.length ?? 0} owners</span>
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Creating..." : "Create Arc multisig"}
        </Button>
      </Form>
    </div>
  );
}
