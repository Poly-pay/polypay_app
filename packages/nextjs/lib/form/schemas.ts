import { validators } from "./validation";
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

const signerSchema = z.object({
  commitment: z.string().min(1, "Signer commitment is required"),
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
  amount: z.string(),
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
  signerCommitment: z.string().min(1, "Signer commitment is required"),
  threshold: z.number().min(1, "Threshold must be at least 1"),
});
export type AddSignerFormData = z.infer<typeof addSignerSchema>;

export const updateThresholdSchema = z.object({
  threshold: z.number().min(1, "Threshold must be at least 1"),
});
export type UpdateThresholdFormData = z.infer<typeof updateThresholdSchema>;
