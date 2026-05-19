import type { FieldChoice } from "./types";

export const SIM_NAO: FieldChoice[] = [
  { value: 1, label: "Sim" },
  { value: 0, label: "Não" },
];

export const CENTRO: FieldChoice[] = [
  { value: 1, label: "Hospital do Subúrbio" },
  { value: 2, label: "Hospital Geral do Estado" },
];

export const SEXO: FieldChoice[] = [
  { value: 0, label: "Masculino" },
  { value: 1, label: "Feminino" },
];

export const ETNIA: FieldChoice[] = [
  { value: 0, label: "Preto" },
  { value: 1, label: "Pardo" },
  { value: 2, label: "Branco" },
  { value: 3, label: "Amarelo" },
  { value: 4, label: "Indígena" },
];

export const NEOPLASIA: FieldChoice[] = [
  { value: 1, label: "SNC" },
  { value: 2, label: "SNP" },
  { value: 3, label: "Outro" },
  { value: 4, label: "Não" },
];

export const ORIGEM_INTERNACAO: FieldChoice[] = [
  { value: 1, label: "SAMU (cena do trauma → HS/HGE)" },
  { value: 2, label: "Atenção Primária/Secundária (UPA, UBS, USF → HS/HGE)" },
];

export const MECANISMO_TRAUMA: FieldChoice[] = [
  { value: 0, label: "Queda de própria altura" },
  { value: 1, label: "Queda em altura maior" },
  { value: 2, label: "Acidente de carro" },
  { value: 3, label: "Acidente de moto" },
  { value: 4, label: "Mergulhos" },
  { value: 5, label: "Agressões" },
  { value: 6, label: "PAF — perfuração por arma de fogo" },
  { value: 7, label: "PAB — perfuração por arma branca" },
  { value: 8, label: "Atropelamento" },
  { value: 9, label: "Queda de objeto na cabeça" },
  { value: 10, label: "Outros" },
];

export const ENTORPECENTES_TIPO: FieldChoice[] = [
  { value: 1, label: "Álcool" },
  { value: 2, label: "Drogas" },
];

export const LOCAL_FRATURA: FieldChoice[] = [
  { value: 0, label: "Frontal" },
  { value: 1, label: "Parietal" },
  { value: 2, label: "Temporal" },
  { value: 3, label: "Occipital" },
  { value: 4, label: "Órbita" },
  { value: 5, label: "Fossa anterior" },
  { value: 6, label: "Fossa média" },
  { value: 7, label: "Fossa posterior" },
];

export const TIPOS_HEMORRAGIA: FieldChoice[] = [
  { value: 0, label: "Contusão" },
  { value: 1, label: "Hematoma subdural" },
  { value: 2, label: "Hematoma epidural" },
  { value: 3, label: "Hematoma intraparenquimatoso" },
  { value: 4, label: "Hemorragia subaracnóidea" },
  { value: 5, label: "Hemorragia intraventricular" },
];

export const LOCAL_HIP: FieldChoice[] = [
  { value: 0, label: "Frontal" },
  { value: 1, label: "Temporal" },
  { value: 2, label: "Parietal" },
  { value: 3, label: "Occipital" },
  { value: 4, label: "Núcleos da base" },
  { value: 5, label: "Cerebelo" },
  { value: 6, label: "Tronco encefálico" },
  { value: 7, label: "Tálamo" },
];

export const HEMISFERIO: FieldChoice[] = [
  { value: 0, label: "Direito" },
  { value: 1, label: "Esquerdo" },
];

export const CISTERNAS: FieldChoice[] = [
  { value: 1, label: "Normal" },
  { value: 2, label: "Desaparecida" },
  { value: 3, label: "Comprimida" },
];

export const SITIO_INFECCAO: FieldChoice[] = [
  { value: 1, label: "ITR — trato respiratório" },
  { value: 2, label: "ITU — trato urinário" },
  { value: 3, label: "Sanguínea" },
  { value: 4, label: "Cateter" },
  { value: 5, label: "Meningite" },
  { value: 6, label: "Empiema do SNC" },
  { value: 7, label: "Abscesso do SNC" },
  { value: 8, label: "Pele" },
  { value: 9, label: "Infecção de ferida operatória" },
  { value: 10, label: "Cerebrite" },
  { value: 11, label: "Outro sítio de infecção" },
  { value: 12, label: "Não especificado" },
];

export const ANTICONVULSIVANTES: FieldChoice[] = [
  { value: 1, label: "Fenitoína" },
  { value: 2, label: "Ácido valpróico / valproato de sódio" },
  { value: 3, label: "Levetiracetam" },
  { value: 4, label: "Carbamazepina" },
  { value: 5, label: "Outro" },
];

export const LOCAL_PCT: FieldChoice[] = [
  { value: 1, label: "UTI" },
  { value: 2, label: "Enfermaria" },
  { value: 3, label: "Emergência" },
  { value: 4, label: "Centro Cirúrgico" },
];

export const TIPO_CIRURGIA: FieldChoice[] = [
  { value: 0, label: "Craniotomia" },
  { value: 1, label: "Craniectomia" },
  { value: 2, label: "Uma trepanação" },
  { value: 3, label: "Duas trepanações" },
];

export const DRENAGEM: FieldChoice[] = [
  { value: 1, label: "Sim" },
  { value: 2, label: "Não" },
];

export const CARATER_CIRURGIA: FieldChoice[] = [
  { value: 0, label: "Eletiva" },
  { value: 1, label: "De emergência" },
];

export const DESTINO_ALTA: FieldChoice[] = [
  { value: 0, label: "Domicílio" },
  { value: 1, label: "Homecare" },
  { value: 2, label: "Hospital de crônicos" },
];

export const GOSE: FieldChoice[] = [
  { value: 1, label: "1 — Morte" },
  { value: 2, label: "2 — Estado vegetativo" },
  { value: 3, label: "3 — Incapacidade grave inferior" },
  { value: 4, label: "4 — Incapacidade grave superior" },
  { value: 5, label: "5 — Incapacidade moderada inferior" },
  { value: 6, label: "6 — Incapacidade moderada superior" },
  { value: 7, label: "7 — Boa recuperação inferior" },
  { value: 8, label: "8 — Boa recuperação superior" },
];
