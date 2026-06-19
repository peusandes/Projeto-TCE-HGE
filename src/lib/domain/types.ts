import type {
  Setor,
  Situacao,
  TcleStatus,
  TipoAnexo,
  StatusColeta,
  TipoColeta,
  VerificacaoAlta,
} from "./enums";

export type Pesquisador = {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
};

export type Plantao = {
  id: string;
  data: string;
  pesquisadores: string[];
  observacoes: string | null;
  criado_em: string;
  criado_por: string | null;
  finalizado: boolean;
  finalizado_em: string | null;
};

export type Paciente = {
  id: string;
  plantao_id: string;
  nome: string;
  setor: Setor;
  leito: string | null;
  situacao: Situacao;
  redcap_id: string | null;
  redcap_export_habilitado: boolean;
  tcle_status: TcleStatus;
  descricao: string | null;
  comentarios: string | null;
  motivo_exclusao: string | null;
  verificacao_alta: VerificacaoAlta | null;
  criado_em: string;
  atualizado_em: string;
};

export type MapaEntry = {
  id: string;
  plantao_id: string;
  paciente_id: string;
  setor: Setor;
  leito: string | null;
  situacao: Situacao;
  tcle_status: TcleStatus;
  descricao: string | null;
  comentarios: string | null;
  verificacao_alta: VerificacaoAlta | null;
  ordem: number;
};

export type ColetaRedcap = {
  id: string;
  paciente_id: string;
  plantao_id: string;
  tipo: TipoColeta;
  dados: Record<string, unknown>;
  status: StatusColeta;
  coletado_por: string | null;
  coletado_em: string;
};

export type Anexo = {
  id: string;
  paciente_id: string;
  plantao_id: string;
  storage_path: string;
  tipo_anexo: TipoAnexo;
  data_referencia: string | null;
  descricao: string | null;
  mime_type: string;
  tamanho_bytes: number;
  enviado_por: string | null;
  enviado_em: string;
  processado: boolean;
};

export type NovoPacienteInput = {
  nome: string;
  setor: Setor;
  leito?: string | null;
  situacao: Situacao;
  tcle_status: TcleStatus;
  descricao?: string | null;
  comentarios?: string | null;
};
