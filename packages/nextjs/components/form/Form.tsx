"use client";

import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";
import { FormProvider } from "react-hook-form";

interface FormProps<TFormValues extends FieldValues = FieldValues>
  extends Omit<React.ComponentProps<"form">, "onSubmit"> {
  form: UseFormReturn<TFormValues>;
  onSubmit: SubmitHandler<TFormValues>;
  children: React.ReactNode;
}

/**
 * Form wrapper component that provides React Hook Form context
 *
 * @example
 * ```tsx
 * const form = useForm<FormData>({
 *   resolver: zodResolver(schema),
 *   defaultValues: { name: "" }
 * });
 *
 * <Form form={form} onSubmit={(data) => console.log(data)}>
 *   <FormField name="name" label="Name" />
 *   <button type="submit">Submit</button>
 * </Form>
 * ```
 */
export function Form<TFormValues extends FieldValues = FieldValues>({
  form,
  onSubmit,
  children,
  ...props
}: FormProps<TFormValues>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} {...props}>
        {children}
      </form>
    </FormProvider>
  );
}
