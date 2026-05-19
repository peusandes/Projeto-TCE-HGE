// Next.js 14 boot hook. Carrega as configs Sentry server-side conforme runtime.
// Sem DSN setada, os arquivos sentry.*.config são no-ops.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
