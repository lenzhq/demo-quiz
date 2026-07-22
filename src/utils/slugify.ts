const LENZ_URL = import.meta.env.VITE_LENZ_URL || "https://lenz.io";

/**
 * Build the public claim-page URL from a claim's verification_id.
 * `lenz.io/c/<id>` resolves to the full verification result page.
 */
export function shortClaimUrl(verificationId: string): string {
  return `${LENZ_URL}/c/${verificationId}`;
}
