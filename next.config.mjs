import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    // Next 14.2: necessário pra src/instrumentation.ts ser carregado.
    // Default em Next 15+.
    instrumentationHook: true,
  },
};

// Sentry: silencia quando SENTRY_AUTH_TOKEN não está setado (dev local).
// Source map upload só acontece em build do Vercel com o token nas envs.
export default withSentryConfig(withSerwist(nextConfig), {
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Tunnel pra contornar adblockers (uBlock bloqueia *.ingest.sentry.io
  // por default). Sentry SDK manda eventos via /monitoring no nosso domínio.
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  widenClientFileUpload: true,
});
