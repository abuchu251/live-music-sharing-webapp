/**
 * Universal clipboard copy utility with fallback for non-HTTPS / HTTP environments.
 * Standard `navigator.clipboard` is restricted to secure contexts (HTTPS or localhost).
 * On HTTP IP deployments (e.g. AWS Lightsail http://3.126.82.53), this fallback ensures
 * copy commands still succeed reliably.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Try modern async Clipboard API if available and in secure context
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy fallback
    }
  }

  // 2. Legacy textarea fallback for HTTP non-secure contexts
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("[Clipboard] Fallback copy failed:", err);
    return false;
  }
}
