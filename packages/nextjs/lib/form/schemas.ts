import { validators } from "./validation";
import { z } from "zod";

// ==================== Authentication ====================

export const loginSchema = z.object({
  email: validators.email,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: validators.requiredString("Name"),
    email: validators.email,
    password: validators.password,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

// ==================== Contact / Address Book ====================

export const createContactSchema = z.object({
  name: validators.requiredString("Name").max(100, "Name too long"),
  address: validators.ethereumAddress,
  notes: z.string().optional(),
});
export type CreateContactFormData = z.infer<typeof createContactSchema>;

export const createGroupSchema = z.object({
  name: validators.requiredString("Group name").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
});
export type CreateGroupFormData = z.infer<typeof createGroupSchema>;

// ==================== Wallet ====================

export const createWalletSchema = z.object({
  name: validators.requiredString("Wallet name").max(50, "Name too long"),
  signers: z.array(validators.ethereumAddress).min(1, "At least one signer required"),
  threshold: z.number().min(1, "Threshold must be at least 1"),
});
export type CreateWalletFormData = z.infer<typeof createWalletSchema>;

// ==================== Transfer ====================

export const transferSchema = z.object({
  recipient: validators.ethereumAddress,
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be greater than 0",
  }),
  token: validators.requiredString("Token"),
  note: z.string().optional(),
});
export type TransferFormData = z.infer<typeof transferSchema>;

// ==================== Batch ====================

export const batchItemSchema = z.object({
  recipient: validators.ethereumAddress,
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be greater than 0",
  }),
  token: validators.requiredString("Token"),
});
export type BatchItemFormData = z.infer<typeof batchItemSchema>;

export const batchTransactionSchema = z.object({
  name: z.string().optional(),
  items: z.array(batchItemSchema).min(1, "At least one transaction required"),
});
export type BatchTransactionFormData = z.infer<typeof batchTransactionSchema>;

// ==================== Profile / Settings ====================

export const updateProfileSchema = z.object({
  name: validators.requiredString("Name"),
  email: validators.email,
  bio: z.string().max(500, "Bio too long").optional(),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: validators.password,
    confirmNewPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

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
