// Shared helpers for rendering schema.org JSON-LD <script> tags from Server Components.
// Pattern follows the official Next.js guide (node_modules/next/dist/docs/01-app/02-guides/json-ld.md):
// JSON.stringify() does not sanitize for XSS, so any literal "<" (e.g. a review body containing
// "</script>") must be escaped to its unicode equivalent before the string is used as script content.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://solarthani.com';

export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
