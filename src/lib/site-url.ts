/**
 * Resolve a URL pública do app pra usar em redirects (magic link / invite email).
 *
 * Ordem de preferência:
 *   1. NEXT_PUBLIC_SITE_URL (manual)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (ex: lanc-tce.vercel.app — sempre o domínio prod)
 *   3. VERCEL_URL (URL do deploy atual — pode ser preview)
 *   4. http://localhost:3030 (dev)
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3030";
}
