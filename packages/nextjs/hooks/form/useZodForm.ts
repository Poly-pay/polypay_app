"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UseFormProps, UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z } from "zod";

/**
 * Custom hook that wraps useForm with Zod resolver
 * Provides type-safe form handling with Zod schema validation
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * function LoginForm() {
 *   const form = useZodForm({
 *     schema,
 *     defaultValues: {
 *       email: "",
 *       password: "",
 *     },
 *   });
 *
 *   const onSubmit = (data: z.infer<typeof schema>) => {
 *     console.log(data);
 *   };
 *
 *   return (
 *     <Form form={form} onSubmit={onSubmit}>
 *       <FormInput name="email" label="Email" type="email" />
 *       <FormInput name="password" label="Password" type="password" />
 *       <button type="submit">Login</button>
 *     </Form>
 *   );
 * }
 * ```
 */
export function useZodForm<TSchema extends z.ZodType<any, any, any>>(
  options: Omit<UseFormProps<z.infer<TSchema>>, "resolver"> & {
    schema: TSchema;
  },
): UseFormReturn<z.infer<TSchema>> {
  const { schema, ...formOptions } = options;

  return useForm<z.infer<TSchema>, any, z.infer<TSchema>>({
    ...formOptions,
    resolver: zodResolver(schema) as any,
  });
}

/**
 * Alternative hook name for consistency with other form hooks
 */
export const useFormWithZod = useZodForm;
