const LENZ_URL = import.meta.env.VITE_LENZ_URL || "https://lenz.io";

/**
 * Generate a URL-friendly slug from claim text, capped at `maxLength`
 * characters and truncated at a word boundary.
 */
export function claimSlug(text: string, maxLength = 60): string {
  if (!text) return "";
  let slug = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    const last = slug.lastIndexOf("-");
    if (last > 0) slug = slug.slice(0, last);
  }
  return slug;
}

/**
 * Build the frontend path for a claim result page on lenz.io.
 */
export function claimPath(slug: string): string {
  return `${LENZ_URL}/c/${slug}`;
}

/**
 * Build a short, shareable URL for a claim using just its share_id.
 */
export function shortClaimUrl(shareId: string): string {
  return `${LENZ_URL}/c/${shareId}`;
}
