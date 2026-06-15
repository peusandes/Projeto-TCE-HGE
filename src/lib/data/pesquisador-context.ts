import { createClient } from "@/lib/supabase/server";
import {
  type CargoFields,
  type RoleValue,
  type DiretoriaValue,
  type CargoEspecialValue,
  canManageEscala,
  canUploadDocs,
  hasFreeEscalaTransit,
  isExtensao,
} from "@/lib/lanc/cargos";

/**
 * Contexto unificado do pesquisador logado: identidade + cargos da liga +
 * permissões derivadas. Substitui o getAuthUserContext/loadCargoSession do
 * lanc-app, usando o NOSSO Supabase (sem Prisma). Lê as colunas adicionadas
 * pela migration 0026.
 */
export type PesquisadorContext = {
  id: string;
  email: string;
  nome: string;
  isAdmin: boolean;
  setupComplete: boolean;
  cargo: CargoFields;
  perms: {
    canManageEscala: boolean;
    canUploadDocs: boolean;
    hasFreeEscalaTransit: boolean;
    isExtensao: boolean;
  };
};

export async function getPesquisadorContext(): Promise<PesquisadorContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: p } = await supabase
    .from("pesquisadores")
    .select(
      "id, email, nome, is_admin, setup_complete, role, diretoria, is_diretor, is_secretario, cargo_especial",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (!p) return null;

  // is_admin (nosso, legado) e role='ADMIN' (lanc-app) são reconciliados: qualquer
  // um dos dois = ADMIN. Mantém os admins atuais funcionando.
  const role: RoleValue = p.is_admin || p.role === "ADMIN" ? "ADMIN" : "MEMBER";
  const cargo: CargoFields = {
    role,
    diretoria: (p.diretoria as DiretoriaValue | null) ?? null,
    isDiretor: Boolean(p.is_diretor),
    isSecretario: Boolean(p.is_secretario),
    cargoEspecial: (p.cargo_especial as CargoEspecialValue | null) ?? null,
  };

  return {
    id: p.id as string,
    email: p.email as string,
    nome: p.nome as string,
    isAdmin: role === "ADMIN",
    setupComplete: Boolean(p.setup_complete),
    cargo,
    perms: {
      canManageEscala: canManageEscala(cargo),
      canUploadDocs: canUploadDocs(cargo),
      hasFreeEscalaTransit: hasFreeEscalaTransit(cargo),
      isExtensao: isExtensao(cargo),
    },
  };
}
