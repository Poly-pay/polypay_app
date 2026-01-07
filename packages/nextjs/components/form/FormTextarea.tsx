"use client";

import { FormField } from "./FormField";
import type { FieldValues, Path } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { Textarea } from "~~/components/ui/textarea";

interface FormTextareaProps<TFormValues extends FieldValues = FieldValues>
  extends Omit<React.ComponentProps<typeof Textarea>, "name"> {
  name: Path<TFormValues>;
  label?: string;
  description?: string;
  orientation?: "vertical" | "horizontal" | "responsive";
}

/**
 * Pre-configured FormField with Textarea component
 *
 * @example
 * ```tsx
 * <FormTextarea
 *   name="bio"
 *   label="Bio"
 *   placeholder="Tell us about yourself"
 *   rows={5}
 * />
 * ```
 */
export function FormTextarea<TFormValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  orientation,
  ...textareaProps
}: FormTextareaProps<TFormValues>) {
  const { formState } = useFormContext<TFormValues>();
  const fieldError = formState.errors[name];

  return (
    <FormField name={name} label={label} description={description} orientation={orientation}>
      {({ field }) => (
        <Textarea
          {...field}
          {...textareaProps}
          id={name}
          aria-invalid={!!fieldError}
          value={field.value ?? ""}
          onChange={e => field.onChange(e.target.value)}
        />
      )}
    </FormField>
  );
}
