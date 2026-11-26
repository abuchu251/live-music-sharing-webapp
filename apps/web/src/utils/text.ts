/**
 * Unescapes HTML and URL entities so natural characters like apostrophes, quotes,
 * ampersands, and angle brackets (<3, >, etc.) display correctly in chat.
 */
export function formatChatContent(content: string): string {
  if (!content) return "";
  return content
    .replace(/&amp;#/gi, "&#")
    .replace(/%23/gi, "#")
    .replace(/&#0*39;|&#x27;|%27/gi, "'")
    .replace(/&quot;|&#0*34;|&#x22;|%22/gi, '"')
    .replace(/&lt;|&#0*60;|&#x3c;|%3c/gi, "<")
    .replace(/&gt;|&#0*62;|&#x3e;|%3e/gi, ">")
    .replace(/&amp;|&#0*38;|&#x26;|%26/gi, "&");
}
