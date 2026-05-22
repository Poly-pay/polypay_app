"use client";

import type { ComponentType } from "react";
import { FormField } from "./FormField";
import type { FieldValues, Path } from "react-hook-form";
import { useFormContext } from "react-hook-form";

interface FormControlOwnProps<TFormValues extends FieldValues = FieldValues> {
  name: Path<TFormValues>;
  label?: string;
  description?: string;
  orientation?: "vertical" | "horizontal" | "responsive";
}

/**
 * Wrap a controlled input component (Input, Textarea, ...) into a FormField-bound
 * control that pulls value/error from react-hook-form. Removes the boilerplate
 * shared by FormInput and FormTextarea.
 */
export function createFormControl<TControlProps extends object>(Control: ComponentType<TControlProps>) {
  return function FormControl<TFormValues extends FieldValues = FieldValues>({
    name,
    label,
    description,
    orientation,
    ...controlProps
  }: FormControlOwnProps<TFormValues> & Omit<TControlProps, "name">) {
    const { formState } = useFormContext<TFormValues>();
    const fieldError = formState.errors[name];

    return (
      <FormField name={name} label={label} description={description} orientation={orientation}>
        {({ field }) => {
          const mergedProps = {
            ...controlProps,
            ...field,
            id: name,
            "aria-invalid": !!fieldError,
            value: field.value ?? "",
            onChange: (e: { target: { value: string } }) => field.onChange(e.target.value),
          } as TControlProps;

          return <Control {...mergedProps} />;
        }}
      </FormField>
    );
  };
}
