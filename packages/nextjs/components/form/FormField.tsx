"use client";

import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

interface FormFieldProps<TFormValues extends FieldValues = FieldValues> {
  name: Path<TFormValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal" | "responsive";
  children: (props: {
    field: {
      name: Path<TFormValues>;
      value: any;
      onChange: (...event: any[]) => void;
      onBlur: () => void;
      ref: React.Ref<any>;
    };
    fieldState: {
      invalid: boolean;
      error?: { message?: string };
    };
  }) => React.ReactElement;
}

/**
 * FormField component that integrates React Hook Form with custom Field UI
 *
 * @example
 * ```tsx
 * <FormField
 *   name="email"
 *   label="Email Address"
 *   description="We'll never share your email"
 * >
 *   {({ field }) => (
 *     <Input
 *       {...field}
 *       type="email"
 *       placeholder="Enter your email"
 *     />
 *   )}
 * </FormField>
 * ```
 */
export function FormField<TFormValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  disabled,
  orientation = "vertical",
  children,
}: FormFieldProps<TFormValues>) {
  const { control } = useFormContext<TFormValues>();

  return (
    <Controller
      name={name}
      control={control}
      disabled={disabled}
      render={({ field, fieldState }) => (
        <Field orientation={orientation} data-invalid={fieldState.invalid}>
          {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
          <FieldContent>
            {description && <FieldDescription>{description}</FieldDescription>}
            {children({ field, fieldState })}
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </FieldContent>
        </Field>
      )}
    />
  );
}
