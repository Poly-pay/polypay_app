"use client";

import { createFormControl } from "./createFormControl";
import { Textarea } from "~~/components/ui/textarea";

/**
 * Pre-configured FormField bound to the Textarea component.
 *
 * @example
 * ```tsx
 * <FormTextarea name="bio" label="Bio" placeholder="Tell us about yourself" rows={5} />
 * ```
 */
export const FormTextarea = createFormControl(Textarea);
