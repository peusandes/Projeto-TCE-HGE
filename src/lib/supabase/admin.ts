import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role key — privilégios totais, BYPASSA RLS.
 * Use APENAS em server actions / route handlers / scripts, NUNCA no cliente.
 * Requer SUPABASE_SERVICE_ROLE_KEY em .env.local (NÃO PREFIXADO com NEXT_PUBLIC).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente em .env.local — necessária para operações de admin (convites de pesquisador). Copie do dashboard Supabase em Project Settings → API → service_role.",
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
