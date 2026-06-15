/**
 * Cargos / diretorias — permissões derivadas. Portado do lanc-app (JP).
 * Funções PURAS (sem dependência de servidor) — use no server e no client.
 * Guards com sessão ficam em getPesquisadorContext (src/lib/data).
 */

export type DiretoriaValue = "EXTENSAO";
export type CargoEspecialValue = "PESQUISADOR_TCE_BABY";
export type RoleValue = "MEMBER" | "ADMIN";

/** Subset de pesquisador suficiente pra decidir permissão. */
export interface CargoFields {
  role: RoleValue;
  diretoria: DiretoriaValue | null;
  isDiretor: boolean;
  isSecretario: boolean;
  cargoEspecial: CargoEspecialValue | null;
}

export function isAdmin(p: CargoFields | null | undefined): boolean {
  return !!p && p.role === "ADMIN";
}

export function isExtensao(p: CargoFields | null | undefined): boolean {
  return !!p && p.diretoria === "EXTENSAO";
}

export function isDiretorExtensao(p: CargoFields | null | undefined): boolean {
  return !!p && p.diretoria === "EXTENSAO" && p.isDiretor;
}

/** Gerir a escala do estágio (alocar ligantes, aprovar solicitações): Extensão + admin. */
export function canManageEscala(p: CargoFields | null | undefined): boolean {
  return isAdmin(p) || isExtensao(p);
}

/** Anexar documentos no perfil de qualquer membro: secretário + diretor de Extensão + admin. */
export function canUploadDocs(p: CargoFields | null | undefined): boolean {
  return isAdmin(p) || !!p?.isSecretario || isDiretorExtensao(p);
}

/** Trânsito livre na escala (entra/troca/sai sem solicitação): Pesquisador TCE baby. */
export function hasFreeEscalaTransit(p: CargoFields | null | undefined): boolean {
  return !!p && p.cargoEspecial === "PESQUISADOR_TCE_BABY";
}

/** Label legível do cargo pra UI. */
export function cargoLabel(p: CargoFields): string {
  const partes: string[] = [];
  if (p.cargoEspecial === "PESQUISADOR_TCE_BABY") partes.push("Pesquisador TCE baby");
  if (p.diretoria === "EXTENSAO") partes.push(p.isDiretor ? "Diretor de Extensão" : "Extensão");
  if (p.isSecretario) partes.push("Secretário");
  if (partes.length === 0) partes.push(p.role === "ADMIN" ? "Admin" : "Ligante");
  return partes.join(" · ");
}

export const DIRETORIA_LABEL: Record<DiretoriaValue, string> = { EXTENSAO: "Extensão" };
export const CARGO_ESPECIAL_LABEL: Record<CargoEspecialValue, string> = {
  PESQUISADOR_TCE_BABY: "Pesquisador TCE baby",
};
