import { createClient } from "@/lib/supabase/server";
import type { DiretoriaValue, CargoEspecialValue, RoleValue } from "@/lib/lanc/cargos";
import type { ProfileStatus } from "@/lib/lanc/enums";

export type SignupRow = {
  id: string;
  email: string;
  nome: string;
  matricula: string | null;
  semestre: number | null;
  mensagem: string | null;
  criado_em: string;
};

export type MembroRow = {
  id: string;
  nome: string | null;
  email: string;
  is_admin: boolean;
  setup_complete: boolean;
  role: RoleValue;
  status: ProfileStatus;
  diretoria: DiretoriaValue | null;
  is_diretor: boolean;
  is_secretario: boolean;
  cargo_especial: CargoEspecialValue | null;
};

export async function listSignupRequestsPendentes(): Promise<SignupRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("signup_requests")
    .select("id, email, nome, matricula, semestre, mensagem, criado_em")
    .eq("status", "PENDING")
    .order("criado_em", { ascending: true });
  if (error) throw new Error(`listSignupRequestsPendentes: ${error.message}`);
  return (data ?? []) as SignupRow[];
}

export async function listMembros(): Promise<MembroRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pesquisadores")
    .select("id, nome, email, is_admin, setup_complete, role, status, diretoria, is_diretor, is_secretario, cargo_especial")
    .order("nome", { ascending: true });
  if (error) throw new Error(`listMembros: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    nome: (p.nome as string | null) ?? null,
    email: p.email as string,
    is_admin: Boolean(p.is_admin),
    setup_complete: Boolean(p.setup_complete),
    role: (p.role as RoleValue) ?? "MEMBER",
    status: (p.status as ProfileStatus) ?? "ATIVO",
    diretoria: (p.diretoria as DiretoriaValue | null) ?? null,
    is_diretor: Boolean(p.is_diretor),
    is_secretario: Boolean(p.is_secretario),
    cargo_especial: (p.cargo_especial as CargoEspecialValue | null) ?? null,
  }));
}
