import { z } from "zod";

/**
 * Common validation schemas that can be reused across forms
 */

export const validators = {
  /**
   * Email validation
   */
  email: z.string().email({ message: "Invalid email address" }),

  /**
   * Required string validation
   */
  requiredString: (fieldName = "This field") => z.string().min(1, { message: `${fieldName} is required` }),

  /**
   * Optional string validation
   */
  optionalString: z.string().optional(),

  /**
   * Password validation (min 8 characters)
   */
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),

  /**
   * URL validation
   */
  url: z.string().url({ message: "Invalid URL format" }),

  /**
   * Number validation with min/max
   */
  number: (min?: number, max?: number) => {
    let schema = z
      .number()
      .catch(() => NaN)
      .refine(val => !isNaN(val), { message: "Must be a number" });
    if (min !== undefined) schema = schema.refine(val => val >= min, { message: `Must be at least ${min}` });
    if (max !== undefined) schema = schema.refine(val => val <= max, { message: `Must be at most ${max}` });
    return schema;
  },

  /**
   * Positive number validation
   */
  positiveNumber: z.number().positive({ message: "Must be a positive number" }),

  /**
   * Ethereum address validation (basic format check)
   */
  ethereumAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address format" }),

  /**
   * Phone number validation (basic international format)
   */
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number format" }),

  /**
   * Date validation
   */
  date: z.date({ message: "Invalid date" }),

  /**
   * Date string validation (ISO format)
   */
  dateString: z.string().datetime({ message: "Invalid date format" }),

  /**
   * Boolean validation
   */
  boolean: z.boolean(),

  /**
   * Array validation with minimum items
   */
  array: <T extends z.ZodTypeAny>(schema: T, minItems = 0) =>
    z.array(schema).min(minItems, { message: `Must have at least ${minItems} items` }),

  /**
   * Enum validation
   */
  enum: <T extends [string, ...string[]]>(values: T, message?: string) =>
    z.enum(values, { message: message || "Invalid value" }),

  /**
   * File validation
   */
  file: (maxSizeMB = 5, allowedTypes?: string[]) => {
    let schema = z.instanceof(File).refine(file => file.size <= maxSizeMB * 1024 * 1024, {
      message: `File size must be less than ${maxSizeMB}MB`,
    });

    if (allowedTypes && allowedTypes.length > 0) {
      schema = schema.refine(file => allowedTypes.includes(file.type), {
        message: `File type must be one of: ${allowedTypes.join(", ")}`,
      });
    }

    return schema;
  },
};

/**
 * Helper to create conditional validation based on another field
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   hasAddress: z.boolean(),
 *   address: z.string().optional(),
 * }).refine(
 *   conditionalValidation('hasAddress', true, (data) => !!data.address),
 *   { message: "Address is required when checkbox is checked", path: ["address"] }
 * );
 * ```
 */
export function conditionalValidation<T>(fieldName: keyof T, expectedValue: any, validator: (data: T) => boolean) {
  return (data: T) => {
    if (data[fieldName] === expectedValue) {
      return validator(data);
    }
    return true;
  };
}

/**
 * Helper to create password confirmation validation
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   password: z.string().min(8),
 *   confirmPassword: z.string(),
 * }).refine(passwordMatch, {
 *   message: "Passwords don't match",
 *   path: ["confirmPassword"],
 * });
 * ```
 */
export function passwordMatch(data: { password: string; confirmPassword: string }) {
  return data.password === data.confirmPassword;
}

/**
 * Helper to transform string to number
 */
export const stringToNumber = z.string().transform(val => {
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
});

/**
 * Helper to transform empty string to undefined
 */
export const emptyStringToUndefined = z.string().transform(val => (val === "" ? undefined : val));
