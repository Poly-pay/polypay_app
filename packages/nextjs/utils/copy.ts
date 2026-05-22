import { formatErrorMessage } from "./formatError";
import { notification } from "./scaffold-eth";

/**
 * Copy text to the clipboard and show a success notification.
 * Returns true on success, false if the clipboard is unavailable or the write fails.
 */
export async function copyToClipboard(text: string, successMessage = "Copied to clipboard"): Promise<boolean> {
  if (!navigator.clipboard || !window.isSecureContext) {
    notification.error("Clipboard is not available in this context");
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    notification.success(successMessage);
    return true;
  } catch (error) {
    notification.error(formatErrorMessage(error, "Failed to copy"));
    return false;
  }
}
