import { notification } from "./scaffold-eth";

export function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    // navigator clipboard api method'
    notification.info("Copied to clipboard");
    return navigator.clipboard.writeText(text);
  }
}
