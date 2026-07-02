import { validators } from "./validation";
import { parseUnits } from "viem";
import { z } from "zod";

// ==================== Contact Book ====================

export const createContactSchema = z.object({
  name: validators.requiredString("Name").max(100, "Name too long"),
  address: validators.requiredString("Address"),
  groupIds: z.array(z.string()).optional(),
});
export type CreateContactFormData = z.infer<typeof createContactSchema>;

export const createGroupSchema = z.object({
  name: validators.requiredString("Group name").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
});
export type CreateGroupFormData = z.infer<typeof createGroupSchema>;

// ==================== Account ====================

// Note: `commitment` is the Poseidon ZK identity commitment, exposed in the UI as "Membership ID".
const signerSchema = z.object({
  commitment: z.string().min(1, "Signer membership ID is required"),
  name: z.string().optional(),
});

export const createAccountSchema = z.object({
  name: validators.requiredString("Account name").max(50, "Name too long"),
  signers: z.array(signerSchema).min(1, "At least one signer required"),
  threshold: z.number().min(1, "Threshold must be at least 1"),
});
export type CreateAccountFormData = z.infer<typeof createAccountSchema>;

// ==================== Transfer ====================

export const transferSchema = z.object({
  recipient: z
    .string()
    .min(1, "Recipient address is required")
    .refine(val => val.startsWith("0x") && val.length === 42, {
      message: "Invalid address format",
    }),
  amount: z.string().refine(
    val => {
      try {
        return parseUnits(val, 18) > 0n;
      } catch {
        return false;
      }
    },
    { message: "Enter a valid positive amount" },
  ),
});
export type TransferFormData = z.infer<typeof transferSchema>;

export const editBatchSchema = transferSchema.extend({
  tokenAddress: z.string().optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
});
export type EditBatchFormData = z.infer<typeof editBatchSchema>;

// ==================== Edit Account ====================

export const editAccountNameSchema = z.object({
  name: z.string().min(1, "Account name is required").max(30, "Name must be 30 characters or less"),
});
export type EditAccountNameFormData = z.infer<typeof editAccountNameSchema>;

export const addSignerSchema = z.object({
  // signerCommitment maps to UI label "Membership ID".
  signerCommitment: z.string().min(1, "Signer membership ID is required"),
  threshold: z.number().min(1, "Threshold must be at least 1"),
});
export type AddSignerFormData = z.infer<typeof addSignerSchema>;

export const updateThresholdSchema = z.object({
  threshold: z.number().min(1, "Threshold must be at least 1"),
});
export type UpdateThresholdFormData = z.infer<typeof updateThresholdSchema>;

// ==================== Arc Multisig ====================

export const createArcAccountSchema = z
  .object({
    owners: z.array(z.object({ address: validators.ethereumAddress })).min(1, "At least one owner is required"),
    threshold: z.number().min(1, "Threshold must be at least 1"),
  })
  .refine(data => data.threshold <= data.owners.length, {
    message: "Threshold cannot exceed the number of owners",
    path: ["threshold"],
  })
  .refine(
    data => {
      const addresses = data.owners.map(o => o.address.toLowerCase());
      return new Set(addresses).size === addresses.length;
    },
    { message: "Owner addresses must be unique", path: ["owners"] },
  );
export type CreateArcAccountFormData = z.infer<typeof createArcAccountSchema>;

// ==================== Feature Request ====================

export const featureRequestSchema = z.object({
  content: validators.requiredString("Feature request").trim(),
});
export type FeatureRequestFormData = z.infer<typeof featureRequestSchema>;
