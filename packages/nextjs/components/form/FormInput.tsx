"use client";

import { FormField } from "./FormField";
import type { FieldValues, Path } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { Input } from "~~/components/ui/input";

interface FormInputProps<TFormValues extends FieldValues = FieldValues>
  extends Omit<React.ComponentProps<typeof Input>, "name"> {
  name: Path<TFormValues>;
  label?: string;
  description?: string;
  orientation?: "vertical" | "horizontal" | "responsive";
}

/**
 * Pre-configured FormField with Input component
 *
 * @example
 * ```tsx
 * <FormInput
 *   name="username"∏∏
 *   label="Username"
 *   placeholder="Enter username"
 *   description="Choose a unique username"
 * />
 * ```
 */
export function FormInput<TFormValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  orientation,
  ...inputProps
}: FormInputProps<TFormValues>) {
  const { formState } = useFormContext<TFormValues>();
  const fieldError = formState.errors[name];

  return (
    <FormField name={name} label={label} description={description} orientation={orientation}>
      {({ field }) => (
        <Input
          {...field}
          {...inputProps}
          id={name}
          aria-invalid={!!fieldError}
          value={field.value ?? ""}
          onChange={e => field.onChange(e.target.value)}
        />
      )}
    </FormField>
  );
}
