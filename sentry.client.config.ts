// Sentry browser-side. Carrega quando o app monta no browser.
// Sem DSN = no-op (não envia nada). Configurar em Vercel envs.

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    // Sample rate baixo porque temos volume pequeno (~10 pesquisadores) e o
    // free tier é 5k events/mês. Vamos pegar tudo até precisar reduzir.
    tracesSampleRate: 1.0,
    // Replays: caro em $ — desativado por enquanto, ligar se algum bug for
    // impossível de reproduzir só pelos breadcrumbs.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.VERCEL_ENV ?? "development",
    // Ignora ruído conhecido — ResizeObserver loop é benigno no Chrome
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
    ],
  });
}
