"use client";

import { createFormControl } from "./createFormControl";
import { Input } from "~~/components/ui/input";

/**
 * Pre-configured FormField bound to the Input component.
 *
 * @example
 * ```tsx
 * <FormInput name="username" label="Username" placeholder="Enter username" />
 * ```
 */
export const FormInput = createFormControl(Input);
