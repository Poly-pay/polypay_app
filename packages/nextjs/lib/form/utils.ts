import type { FieldErrors, FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Get first error message from form errors
 */
export function getFirstError<T extends FieldValues>(errors: FieldErrors<T>): string | undefined {
  const firstErrorKey = Object.keys(errors)[0];
  if (!firstErrorKey) return undefined;

  const error = errors[firstErrorKey as keyof T];
  return error?.message as string | undefined;
}

/**
 * Get all error messages from form errors as array
 */
export function getAllErrors<T extends FieldValues>(errors: FieldErrors<T>): string[] {
  return Object.values(errors)
    .map(error => error?.message)
    .filter((msg): msg is string => typeof msg === "string");
}

/**
 * Check if form has any errors
 */
export function hasErrors<T extends FieldValues>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Reset form with new default values
 */
export function resetForm<T extends FieldValues>(
  form: UseFormReturn<T>,
  defaultValues?: Partial<T>,
  options?: {
    keepDirty?: boolean;
    keepErrors?: boolean;
  },
) {
  form.reset(defaultValues as T, options);
}

/**
 * Set multiple form values at once
 */
export function setFormValues<T extends FieldValues>(form: UseFormReturn<T>, values: Partial<T>) {
  Object.entries(values).forEach(([key, value]) => {
    form.setValue(key as any, value, { shouldValidate: true, shouldDirty: true });
  });
}

/**
 * Get form values as plain object (useful for debugging)
 */
export function getFormValues<T extends FieldValues>(form: UseFormReturn<T>): T {
  return form.getValues();
}

/**
 * Check if form is dirty (has unsaved changes)
 */
export function isFormDirty<T extends FieldValues>(form: UseFormReturn<T>): boolean {
  return form.formState.isDirty;
}

/**
 * Check if form is valid
 */
export function isFormValid<T extends FieldValues>(form: UseFormReturn<T>): boolean {
  return form.formState.isValid;
}

/**
 * Check if form is submitting
 */
export function isFormSubmitting<T extends FieldValues>(form: UseFormReturn<T>): boolean {
  return form.formState.isSubmitting;
}

/**
 * Get dirty fields from form
 */
export function getDirtyFields<T extends FieldValues>(form: UseFormReturn<T>): Partial<T> {
  const dirtyFields = form.formState.dirtyFields;
  const values = form.getValues();

  return Object.keys(dirtyFields).reduce((acc, key) => {
    acc[key as keyof T] = values[key as keyof T];
    return acc;
  }, {} as Partial<T>);
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred";
}

/**
 * Debounce function for form inputs
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * Create a form submit handler with error handling
 */
export function createSubmitHandler<T extends FieldValues>(
  onSuccess: (data: T) => void | Promise<void>,
  onError?: (error: unknown) => void,
) {
  return async (data: T) => {
    try {
      await onSuccess(data);
    } catch (error) {
      console.error("Form submission error:", error);
      onError?.(error);
    }
  };
}

/**
 * Create default values with type safety
 */
export function createDefaultValues<T extends FieldValues>(values: T): T {
  return values;
}
