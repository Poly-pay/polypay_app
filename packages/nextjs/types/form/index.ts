import type { FieldErrors, FieldValues, Path, UseFormReturn } from "react-hook-form";

/**
 * Base form component props that include React Hook Form instance
 */
export interface BaseFormProps<TFormValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFormValues>;
}

/**
 * Form field render props
 */
export interface FormFieldRenderProps<TFormValues extends FieldValues = FieldValues> {
  field: {
    name: Path<TFormValues>;
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    disabled?: boolean;
    ref: React.Ref<any>;
  };
  fieldState: {
    invalid: boolean;
    error?: FieldErrors<TFormValues>[Path<TFormValues>];
    isDirty: boolean;
    isTouched: boolean;
  };
}

/**
 * Form submit handler type
 */
export type FormSubmitHandler<TFormValues extends FieldValues = FieldValues> = (
  data: TFormValues,
) => void | Promise<void>;

/**
 * Form error handler type
 */
export type FormErrorHandler<TFormValues extends FieldValues = FieldValues> = (
  errors: FieldErrors<TFormValues>,
) => void;

/**
 * Generic form configuration options
 */
export interface FormConfig<TFormValues extends FieldValues = FieldValues> {
  defaultValues?: Partial<TFormValues>;
  mode?: "onSubmit" | "onBlur" | "onChange" | "onTouched" | "all";
  reValidateMode?: "onSubmit" | "onBlur" | "onChange";
  resetOptions?: {
    keepDirtyValues?: boolean;
    keepErrors?: boolean;
    keepDirty?: boolean;
    keepValues?: boolean;
    keepDefaultValues?: boolean;
    keepIsSubmitted?: boolean;
    keepTouched?: boolean;
    keepIsValid?: boolean;
    keepSubmitCount?: boolean;
  };
}
