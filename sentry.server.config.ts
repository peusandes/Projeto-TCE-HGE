// Sentry server-side. Carrega em Server Components, Server Actions e API
// routes. Sem DSN = no-op.

import * as Sentry from "@sentry/nextjs";

// Sempre usa NEXT_PUBLIC_SENTRY_DSN — DSN não é secret (já vai no client).
// SENTRY_AUTH_TOKEN é a secret de verdade (só lê em build pra source maps).
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 1.0,
    environment: process.env.VERCEL_ENV ?? "development",
  });
}
