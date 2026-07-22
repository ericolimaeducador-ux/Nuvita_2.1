// Enums e tipos espelhados da API NestJS (packages/shared + domain entities).

export enum Papel {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ENFERMEIRO = 'ENFERMEIRO',
  SECRETARIA = 'SECRETARIA',
  PACIENTE = 'PACIENTE',
}

export const PAPEL_LABEL: Record<Papel, string> = {
  [Papel.SUPER_ADMIN]: 'Super Admin',
  [Papel.ADMIN]: 'Administrador',
  [Papel.ENFERMEIRO]: 'Enfermeiro(a)',
  [Papel.SECRETARIA]: 'Secretaria',
  [Papel.PACIENTE]: 'Paciente',
};

// Papéis profissionais que prestam atendimento (paridade de permissões clínicas).
export const PAPEIS_PROFISSIONAIS: Papel[] = [
  Papel.ENFERMEIRO,
];

export enum ModalidadeAtendimento {
  ENFERMAGEM = 'enfermagem',
}

export const MODALIDADE_LABEL: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.ENFERMAGEM]: 'Enfermagem',
};

export enum Sexo {
  FEMININO = 'FEMININO',
  MASCULINO = 'MASCULINO',
  OUTRO = 'OUTRO',
  NAO_INFORMADO = 'NAO_INFORMADO',
}

export const SEXO_LABEL: Record<Sexo, string> = {
  [Sexo.FEMININO]: 'Feminino',
  [Sexo.MASCULINO]: 'Masculino',
  [Sexo.OUTRO]: 'Outro',
  [Sexo.NAO_INFORMADO]: 'Não informado',
};

export enum StatusAgendamento {
  AGENDADO = 'agendado',
  CONFIRMADO = 'confirmado',
  CANCELADO = 'cancelado',
  CONCLUIDO = 'concluido',
  FALTA = 'falta',
}

export const STATUS_AGENDAMENTO_LABEL: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]: 'Agendado',
  [StatusAgendamento.CONFIRMADO]: 'Confirmado',
  [StatusAgendamento.CANCELADO]: 'Cancelado',
  [StatusAgendamento.CONCLUIDO]: 'Concluído',
  [StatusAgendamento.FALTA]: 'Falta',
};

export const STATUS_AGENDAMENTO_COLOR: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]: 'blue',
  [StatusAgendamento.CONFIRMADO]: 'cyan',
  [StatusAgendamento.CANCELADO]: 'red',
  [StatusAgendamento.CONCLUIDO]: 'green',
  [StatusAgendamento.FALTA]: 'volcano',
};

export enum TipoAgendamento {
  ATENDIMENTO_ENFERMAGEM = 'atendimento_enfermagem',
  PROCEDIMENTO_ENFERMAGEM = 'procedimento_enfermagem',
  ENTREVISTA = 'entrevista',
}

export const TIPO_AGENDAMENTO_LABEL: Record<TipoAgendamento, string> = {
  [TipoAgendamento.ATENDIMENTO_ENFERMAGEM]: 'Atend. Enfermagem',
  [TipoAgendamento.PROCEDIMENTO_ENFERMAGEM]: 'Proc. Enfermagem',
  [TipoAgendamento.ENTREVISTA]: 'Entrevista (Fluxo Clínico)',
};

// Tipos de agendamento sugeridos por modalidade (para filtrar o formulário).
export const TIPOS_POR_MODALIDADE: Record<ModalidadeAtendimento, TipoAgendamento[]> = {
  [ModalidadeAtendimento.ENFERMAGEM]: [
    TipoAgendamento.ATENDIMENTO_ENFERMAGEM,
    TipoAgendamento.PROCEDIMENTO_ENFERMAGEM,
    TipoAgendamento.ENTREVISTA,
  ],
};

export enum TipoAtendimento {
  CONSULTA = 'consulta',
  RETORNO = 'retorno',
  URGENCIA = 'urgencia',
  TELECONSULTA = 'teleconsulta',
  CONSULTA_ENFERMAGEM = 'consulta_enfermagem',
}

export const TIPO_ATENDIMENTO_LABEL: Record<TipoAtendimento, string> = {
  [TipoAtendimento.CONSULTA]: 'Consulta',
  [TipoAtendimento.RETORNO]: 'Retorno',
  [TipoAtendimento.URGENCIA]: 'Urgência',
  [TipoAtendimento.TELECONSULTA]: 'Teleconsulta',
  [TipoAtendimento.CONSULTA_ENFERMAGEM]: 'Consulta de Enfermagem',
};

/** Mapeia o tipo de agendamento para o tipo de atendimento (prontuário) mais
 * próximo, usado para pré-preencher "Iniciar atendimento" a partir da agenda. */
export const TIPO_ATENDIMENTO_POR_AGENDAMENTO: Partial<Record<TipoAgendamento, TipoAtendimento>> = {
  [TipoAgendamento.ATENDIMENTO_ENFERMAGEM]: TipoAtendimento.CONSULTA_ENFERMAGEM,
  [TipoAgendamento.PROCEDIMENTO_ENFERMAGEM]: TipoAtendimento.CONSULTA_ENFERMAGEM,
  [TipoAgendamento.ENTREVISTA]: TipoAtendimento.CONSULTA_ENFERMAGEM,
};

// ---- Permissões por módulo (espelho de packages/shared/src/auth/permissao.ts) ----

export enum Modulo {
  DASHBOARD = 'DASHBOARD',
  PACIENTES = 'PACIENTES',
  AGENDA = 'AGENDA',
  PRONTUARIOS = 'PRONTUARIOS',
  DOCUMENTOS = 'DOCUMENTOS',
  FINANCEIRO = 'FINANCEIRO',
  NOTIFICACOES = 'NOTIFICACOES',
  TELEMEDICINA = 'TELEMEDICINA',
  FERIDAS = 'FERIDAS',
  ANALYTICS = 'ANALYTICS',
  CLINICA = 'CLINICA',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const TODOS_MODULOS: Modulo[] = Object.values(Modulo);

export const MODULO_LABEL: Record<Modulo, string> = {
  [Modulo.DASHBOARD]: 'Dashboard',
  [Modulo.PACIENTES]: 'Pacientes',
  [Modulo.AGENDA]: 'Agenda',
  [Modulo.PRONTUARIOS]: 'Prontuários',
  [Modulo.DOCUMENTOS]: 'Documentos',
  [Modulo.FINANCEIRO]: 'Financeiro',
  [Modulo.NOTIFICACOES]: 'Notificações',
  [Modulo.TELEMEDICINA]: 'Telemedicina',
  [Modulo.FERIDAS]: 'Feridas',
  [Modulo.ANALYTICS]: 'Relatórios / analytics',
  [Modulo.CLINICA]: 'Configuração da clínica',
  [Modulo.SUPER_ADMIN]: 'Super Admin',
};

const M = Modulo;

/** Módulos que cada papel enxerga por padrão (o admin ajusta por usuário). */
export const PERMISSOES_PADRAO_POR_PAPEL: Record<Papel, Modulo[]> = {
  [Papel.SUPER_ADMIN]: TODOS_MODULOS,
  [Papel.ADMIN]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS, M.FINANCEIRO,
    M.NOTIFICACOES, M.TELEMEDICINA, M.FERIDAS,
    M.ANALYTICS, M.CLINICA,
  ],
  [Papel.ENFERMEIRO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS,
    M.FERIDAS, M.TELEMEDICINA,
  ],
  [Papel.SECRETARIA]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS, M.FINANCEIRO, M.NOTIFICACOES,
  ],
  [Papel.PACIENTE]: [M.DASHBOARD],
};

/**
 * Permissões efetivas = padrão do papel ∪ concedidas − revogadas.
 * SUPER_ADMIN sempre tem acesso total, independentemente das exceções.
 */
export function resolvePermissoes(
  papel: Papel,
  concedidas: Modulo[] = [],
  revogadas: Modulo[] = [],
): Modulo[] {
  if (papel === Papel.SUPER_ADMIN) return TODOS_MODULOS;
  const base = new Set<Modulo>(PERMISSOES_PADRAO_POR_PAPEL[papel] ?? []);
  for (const m of concedidas) base.add(m);
  for (const m of revogadas) base.delete(m);
  return TODOS_MODULOS.filter((m) => base.has(m));
}

export function temPermissao(permissoes: Modulo[] | undefined, modulo: Modulo): boolean {
  return !!permissoes && permissoes.includes(modulo);
}

export interface AuthUser {
  id: string;
  nome?: string;
  email: string;
  papel: Papel;
  clinicaId?: string;
  /** Registro do conselho (CRM/COREN/OAB) — usado p/ preencher documentos. Ausente em sessões antigas. */
  registroProfissional?: string;
  /** Permissões efetivas calculadas pela API; ausente em sessões antigas. */
  permissoes?: Modulo[];
}

/** Rótulo do registro profissional conforme o papel (CRM/COREN/OAB). */
export const REGISTRO_LABEL: Partial<Record<Papel, string>> = {
  [Papel.ENFERMEIRO]: 'COREN',
};
export function registroLabel(papel?: Papel): string {
  return (papel && REGISTRO_LABEL[papel]) || 'Registro profissional';
}
/** Papéis que possuem registro de conselho profissional. */
export function papelTemRegistro(papel?: Papel): boolean {
  return !!papel && papel in REGISTRO_LABEL;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Endereco {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface ResponsavelTecnico {
  nome: string;
  registroProfissional: string;
}

/** Identidade da clínica do tenant — usada no timbre de documentos gerados. */
export interface Clinica {
  id: string;
  nome: string;
  cnpj: string;
  telefone?: string;
  endereco?: Endereco;
  configuracoes: {
    logoUrl?: string;
    responsavelTecnico?: ResponsavelTecnico;
  };
}

export interface ConsentimentoLGPD {
  aceito: boolean;
  dataAceite: string;
  versao: string;
}

export interface Paciente {
  id: string;
  clinicaId: string;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  sexo?: Sexo;
  telefone?: string;
  email?: string;
  endereco?: Endereco;
  consentimentoLGPD?: ConsentimentoLGPD;
  observacoes?: string;
  ativo?: boolean;
  criadoEm?: string;
}

export interface PageResult<T> {
  items?: T[];
  data?: T[];
  nextCursor?: string | null;
  total?: number;
}

export interface Agendamento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  modalidade: ModalidadeAtendimento;
  dataHoraInicio: string;
  dataHoraFim: string;
  tipo: TipoAgendamento;
  status: StatusAgendamento;
  observacoes?: string;
  motivoCancelamento?: string;
  /** Enriquecidos pelo backend na leitura — identificação segura do paciente. */
  pacienteNome?: string;
  pacienteCpf?: string;
}

export interface DeclaracaoComparecimento {
  pacienteNome?: string;
  pacienteCpf?: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  modalidade: ModalidadeAtendimento;
  profissionalNome?: string;
  profissionalRegistro?: string;
}

export interface SinaisVitais {
  pressaoArterial?: string;
  frequenciaCardiaca?: number;
  frequenciaRespiratoria?: number;
  temperatura?: number;
  saturacaoO2?: number;
  peso?: number;
  altura?: number;
  escalaDor?: number;
}

export interface ProntuarioSubjetivo {
  queixaPrincipal?: string;
  hda?: string;
  antecedentesPessoais?: string;
  antecedentesCirurgicos?: string;
  medicamentosEmUso?: string;
  alergias?: string;
  historiaFamiliar?: string;
  historiaSocial?: string;
  revisaoSistemas?: string;
}

export interface ExameSegmentar {
  cabecaPescoco?: string;
  cardiovascular?: string;
  respiratorio?: string;
  abdome?: string;
  geniturinario?: string;
  neurologico?: string;
  extremidades?: string;
  pele?: string;
}

export interface ProntuarioObjetivo {
  estadoGeral?: string;
  sinaisVitais?: SinaisVitais;
  exameSegmentar?: ExameSegmentar;
  exameFisico?: string;
}

export interface ProntuarioAvaliacao {
  hipotesesDiagnosticas?: string[];
  cid10?: string[];
  diagnosticoDefinitivo?: string;
  evolucao?: string;
}

export interface ProntuarioPlano {
  conduta?: string;
  prescricao?: string;
  examesSolicitados?: string[];
  orientacoes?: string;
  encaminhamentos?: string;
  retorno?: string;
}

export interface AssinaturaProntuario {
  medicoId: string;
  dataAssinatura: string;
  hash?: string;
}

/**
 * Registro da consulta de enfermagem em estomaterapia. Complementa a
 * AvaliacaoFerida (que cobre T/I/M/E do TIMERS por ferida) com o "S"
 * (fatores sociais) e o contexto geral do paciente.
 */
export interface RegistroEnfermagem {
  motivoAtendimento?: string;
  comorbidadesRelevantes?: string;
  mobilidade?: string;
  escoreBraden?: number;
  estadoNutricional?: string;
  dorGeral?: number;
  curativoAtual?: string;
  adesaoTratamento?: string;
  orientacoesFornecidas?: string;
  evolucao?: string;
  planoProximosPassos?: string;
  coren?: string;
}

/** Ordem/rótulos de exibição do registro de enfermagem — usado no histórico
 * de atendimentos e na impressão do prontuário de estomaterapia. */
export const REGISTRO_ENFERMAGEM_CAMPOS: Array<[keyof RegistroEnfermagem, string]> = [
  ['motivoAtendimento', 'Motivo do atendimento'],
  ['comorbidadesRelevantes', 'Comorbidades relevantes'],
  ['mobilidade', 'Mobilidade'],
  ['escoreBraden', 'Escore de Braden'],
  ['estadoNutricional', 'Estado nutricional'],
  ['dorGeral', 'Dor geral (0-10)'],
  ['curativoAtual', 'Curativo atual'],
  ['adesaoTratamento', 'Adesão ao tratamento / suporte'],
  ['orientacoesFornecidas', 'Orientações fornecidas'],
  ['evolucao', 'Evolução'],
  ['planoProximosPassos', 'Plano / próximos passos'],
  ['coren', 'COREN'],
];

export interface Prontuario {
  id: string;
  clinicaId: string;
  pacienteId: string;
  dataAtendimento: string;
  tipo: TipoAtendimento;
  assinado?: AssinaturaProntuario;
  subjetivo?: ProntuarioSubjetivo;
  objetivo?: ProntuarioObjetivo;
  avaliacao?: ProntuarioAvaliacao;
  plano?: ProntuarioPlano;
  registroEnfermagem?: RegistroEnfermagem;
}

export enum TipoDocumento {
  EXAME = 'exame',
  RECEITA = 'receita',
  LAUDO = 'laudo',
  TERMO = 'termo',
  FOTO_FERIDA = 'foto_ferida',
  OUTRO = 'outro',
}
export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  [TipoDocumento.EXAME]: 'Exame',
  [TipoDocumento.RECEITA]: 'Receita',
  [TipoDocumento.LAUDO]: 'Laudo',
  [TipoDocumento.TERMO]: 'Termo',
  [TipoDocumento.FOTO_FERIDA]: 'Foto de ferida',
  [TipoDocumento.OUTRO]: 'Outro',
};

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/dicom',
] as const;
export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export interface Documento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  prontuarioId?: string;
  feridaId?: string;
  avaliacaoFeridaId?: string;
  nome: string;
  tipo: TipoDocumento;
  mimeType: AllowedDocumentMimeType;
  tamanho: number;
  hash: string;
  uploadPor: string;
  thumbnailUrl?: string;
  criadoEm: string;
}

export interface PresignUploadResponse {
  documento: Documento;
  uploadUrl: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
}

// ---------- Feridas ----------

export enum Etiologia {
  PRESSAO = 'pressao',
  PE_DIABETICO = 'pe_diabetico',
  VENOSA = 'venosa',
  ARTERIAL = 'arterial',
  CIRURGICA = 'cirurgica',
  TRAUMATICA = 'traumatica',
  QUEIMADURA = 'queimadura',
  MISTA = 'mista',
  DESCONHECIDA = 'desconhecida',
}
export const ETIOLOGIA_LABEL: Record<Etiologia, string> = {
  [Etiologia.PRESSAO]: 'Pressão',
  [Etiologia.PE_DIABETICO]: 'Pé diabético',
  [Etiologia.VENOSA]: 'Venosa',
  [Etiologia.ARTERIAL]: 'Arterial',
  [Etiologia.CIRURGICA]: 'Cirúrgica',
  [Etiologia.TRAUMATICA]: 'Traumática',
  [Etiologia.QUEIMADURA]: 'Queimadura',
  [Etiologia.MISTA]: 'Mista',
  [Etiologia.DESCONHECIDA]: 'Desconhecida',
};

export enum StatusFerida {
  ATIVA = 'ativa',
  CICATRIZADA = 'cicatrizada',
  INATIVA = 'inativa',
}
export const STATUS_FERIDA_LABEL: Record<StatusFerida, string> = {
  [StatusFerida.ATIVA]: 'Ativa',
  [StatusFerida.CICATRIZADA]: 'Cicatrizada',
  [StatusFerida.INATIVA]: 'Inativa',
};

export enum NivelExsudato {
  NENHUM = 'nenhum',
  BAIXO = 'baixo',
  MODERADO = 'moderado',
  ALTO = 'alto',
}
export const NIVEL_EXSUDATO_LABEL: Record<NivelExsudato, string> = {
  [NivelExsudato.NENHUM]: 'Nenhum',
  [NivelExsudato.BAIXO]: 'Baixo',
  [NivelExsudato.MODERADO]: 'Moderado',
  [NivelExsudato.ALTO]: 'Alto',
};

export enum NivelRisco {
  BAIXO = 'baixo',
  MODERADO = 'moderado',
  ALTO = 'alto',
  URGENTE = 'urgente',
}
export const NIVEL_RISCO_LABEL: Record<NivelRisco, string> = {
  [NivelRisco.BAIXO]: 'Baixo',
  [NivelRisco.MODERADO]: 'Moderado',
  [NivelRisco.ALTO]: 'Alto',
  [NivelRisco.URGENTE]: 'Urgente',
};

export enum AchadoPerilesional {
  ERITEMA = 'eritema',
  MACERACAO = 'maceracao',
  EDEMA = 'edema',
  CALOR = 'calor',
  DERMATITE = 'dermatite',
  INDURACAO = 'induracao',
  CREPITACAO = 'crepitacao',
}
export const ACHADO_PERILESIONAL_LABEL: Record<AchadoPerilesional, string> = {
  [AchadoPerilesional.ERITEMA]: 'Eritema',
  [AchadoPerilesional.MACERACAO]: 'Maceração',
  [AchadoPerilesional.EDEMA]: 'Edema',
  [AchadoPerilesional.CALOR]: 'Calor',
  [AchadoPerilesional.DERMATITE]: 'Dermatite',
  [AchadoPerilesional.INDURACAO]: 'Induração',
  [AchadoPerilesional.CREPITACAO]: 'Crepitação',
};

export interface Ferida {
  id: string;
  clinicaId: string;
  pacienteId: string;
  rotulo: string;
  etiologia: Etiologia;
  localizacao: string;
  status: StatusFerida;
  dataInicio?: string;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Medicao {
  comprimentoCm: number;
  larguraCm: number;
  profundidadeCm: number;
  areaCm2?: number;
}

export interface PerfilTecidual {
  granulacaoPct: number;
  epitelizacaoPct: number;
  esfaceloPct: number;
  necrosePct: number;
}

export interface RecomendacaoClinica {
  risco: NivelRisco;
  titulo: string;
  justificativa: string;
  acao: string;
  regraId: string;
  exigeRevisaoHumana: true;
}

// ---------- Escalas clínicas (PUSH 3.0 / RESVECH 2.0) ----------

export enum BordasFerida {
  NAO_DISTINGUIVEIS = 'nao_distinguiveis',
  DIFUSAS = 'difusas',
  DELIMITADAS = 'delimitadas',
  DANIFICADAS = 'danificadas',
  ENGROSSADAS = 'engrossadas',
}
export const BORDAS_FERIDA_LABEL: Record<BordasFerida, string> = {
  [BordasFerida.NAO_DISTINGUIVEIS]: 'Não distinguíveis',
  [BordasFerida.DIFUSAS]: 'Difusas',
  [BordasFerida.DELIMITADAS]: 'Delimitadas',
  [BordasFerida.DANIFICADAS]: 'Danificadas',
  [BordasFerida.ENGROSSADAS]: 'Engrossadas ("envelhecidas")',
};

export enum TecidosAfetados {
  PELE_INTACTA = 'pele_intacta',
  EPIDERME_DERME = 'epiderme_derme',
  SUBCUTANEO = 'subcutaneo',
  MUSCULO = 'musculo',
  OSSO_ANEXOS = 'osso_anexos',
}
export const TECIDOS_AFETADOS_LABEL: Record<TecidosAfetados, string> = {
  [TecidosAfetados.PELE_INTACTA]: 'Pele intacta cicatrizada',
  [TecidosAfetados.EPIDERME_DERME]: 'Epiderme e derme',
  [TecidosAfetados.SUBCUTANEO]: 'Tecido subcutâneo',
  [TecidosAfetados.MUSCULO]: 'Músculo',
  [TecidosAfetados.OSSO_ANEXOS]: 'Osso e tecidos anexos',
};

export enum SinalInfeccaoResvech {
  DOR_CRESCENTE = 'dor_crescente',
  EXSUDATO_PURULENTO = 'exsudato_purulento',
  TECIDO_FRIAVEL = 'tecido_friavel',
  BIOFILME_COMPATIVEL = 'biofilme_compativel',
  HIPERGRANULACAO = 'hipergranulacao',
  LESOES_SATELITE = 'lesoes_satelite',
  PALIDEZ_TECIDO = 'palidez_tecido',
}
export const SINAL_INFECCAO_RESVECH_LABEL: Record<SinalInfeccaoResvech, string> = {
  [SinalInfeccaoResvech.DOR_CRESCENTE]: 'Dor crescente',
  [SinalInfeccaoResvech.EXSUDATO_PURULENTO]: 'Exsudato purulento',
  [SinalInfeccaoResvech.TECIDO_FRIAVEL]: 'Tecido friável / sangra fácil',
  [SinalInfeccaoResvech.BIOFILME_COMPATIVEL]: 'Tecido compatível com biofilme',
  [SinalInfeccaoResvech.HIPERGRANULACAO]: 'Hipergranulação',
  [SinalInfeccaoResvech.LESOES_SATELITE]: 'Lesões satélite',
  [SinalInfeccaoResvech.PALIDEZ_TECIDO]: 'Palidez do tecido',
};

export interface PushScore {
  area: number;
  exsudato: number;
  tipoTecido: number;
  total: number;
}

export interface ResvechScore {
  dimensao: number;
  profundidade: number;
  bordas: number;
  tecidoLeito: number;
  exsudato: number;
  infeccaoInflamacao: number;
  total: number;
}

export interface EscalasClinicas {
  push: PushScore;
  resvech?: ResvechScore;
  versao: string;
}

export interface AvaliacaoFerida {
  id: string;
  feridaId: string;
  clinicaId: string;
  profissionalId: string;
  medicao: Medicao;
  tecido: PerfilTecidual;
  exsudato: NivelExsudato;
  escalaDor: number;
  odor: boolean;
  achadosPerilesionais: AchadoPerilesional[];
  sinaisSistemicos: boolean;
  perfusaoRuim: boolean;
  ossoOuTendaoExposto: boolean;
  pioraAreaPct30Dias?: number;
  diasCicatrizacaoEstagnada?: number;
  bordas?: BordasFerida;
  tecidosAfetados?: TecidosAfetados;
  sinaisInfeccao?: SinalInfeccaoResvech[];
  recomendacoes: RecomendacaoClinica[];
  motorClinico: string;
  escalas?: EscalasClinicas;
  criadoEm: string;
}

export interface PontoTimelineFerida {
  avaliacaoId: string;
  criadoEm: string;
  areaCm2?: number;
  profundidadeCm: number;
  escalaDor: number;
  exsudato: NivelExsudato;
  necrosePct: number;
  esfaceloPct: number;
  granulacaoPct: number;
  epitelizacaoPct: number;
  maiorRisco: NivelRisco;
  titulosRecomendacoes: string[];
  pushTotal?: number;
  resvechTotal?: number;
}

export interface TimelineFerida {
  pontos: PontoTimelineFerida[];
  tendencia: { status: 'melhorando' | 'piorando' | 'estavel' };
}

// ---------- Financeiro ----------
export enum StatusLancamento {
  PENDENTE = 'pendente',
  RECEBIDO = 'recebido',
  CANCELADO = 'cancelado',
}

export const STATUS_LANCAMENTO_LABEL: Record<StatusLancamento, string> = {
  [StatusLancamento.PENDENTE]: 'Pendente',
  [StatusLancamento.RECEBIDO]: 'Recebido',
  [StatusLancamento.CANCELADO]: 'Cancelado',
};

export const STATUS_LANCAMENTO_COLOR: Record<StatusLancamento, string> = {
  [StatusLancamento.PENDENTE]: 'orange',
  [StatusLancamento.RECEBIDO]: 'green',
  [StatusLancamento.CANCELADO]: 'red',
};

export enum TipoLancamento {
  RECEITA = 'receita',
  DESPESA = 'despesa',
}

export const TIPO_LANCAMENTO_LABEL: Record<TipoLancamento, string> = {
  [TipoLancamento.RECEITA]: 'Receita',
  [TipoLancamento.DESPESA]: 'Despesa',
};

export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  CARTAO_CREDITO = 'cartao_credito',
  CARTAO_DEBITO = 'cartao_debito',
  PIX = 'pix',
  TRANSFERENCIA = 'transferencia',
  CONVENIO = 'convenio',
  BOLETO = 'boleto',
}

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  [FormaPagamento.DINHEIRO]: 'Dinheiro',
  [FormaPagamento.CARTAO_CREDITO]: 'Cartão de Crédito',
  [FormaPagamento.CARTAO_DEBITO]: 'Cartão de Débito',
  [FormaPagamento.PIX]: 'PIX',
  [FormaPagamento.TRANSFERENCIA]: 'Transferência',
  [FormaPagamento.CONVENIO]: 'Convênio',
  [FormaPagamento.BOLETO]: 'Boleto',
};

/**
 * Categoria do lançamento na realidade de uma clínica de estomaterapia.
 *
 * ENTRADAS — as quatro fontes de receita: consulta, avaliação avulsa de ferida,
 * venda de produto e consultoria a hospitais/clínicas/ILPI.
 * SAÍDAS — compra de produto, insumos, aluguel, contas fixas e saídas
 * esporádicas.
 */
export enum CategoriaLancamento {
  CONSULTA = 'consulta',
  AVALIACAO_AVULSA = 'avaliacao_avulsa',
  VENDA_PRODUTO = 'venda_produto',
  CONSULTORIA = 'consultoria',
  COMPRA_PRODUTO = 'compra_produto',
  INSUMO = 'insumo',
  ALUGUEL = 'aluguel',
  CONTA_FIXA = 'conta_fixa',
  DESPESA_EVENTUAL = 'despesa_eventual',
  OUTRO = 'outro',
}

export const CATEGORIA_LANCAMENTO_LABEL: Record<CategoriaLancamento, string> = {
  [CategoriaLancamento.CONSULTA]: 'Consulta',
  [CategoriaLancamento.AVALIACAO_AVULSA]: 'Avaliação avulsa de ferida',
  [CategoriaLancamento.VENDA_PRODUTO]: 'Venda de produto',
  [CategoriaLancamento.CONSULTORIA]: 'Consultoria (hospital/clínica/ILPI)',
  [CategoriaLancamento.COMPRA_PRODUTO]: 'Compra de produto',
  [CategoriaLancamento.INSUMO]: 'Insumos',
  [CategoriaLancamento.ALUGUEL]: 'Aluguel',
  [CategoriaLancamento.CONTA_FIXA]: 'Conta fixa',
  [CategoriaLancamento.DESPESA_EVENTUAL]: 'Saída esporádica',
  [CategoriaLancamento.OUTRO]: 'Outro',
};

/** Categorias válidas como entrada de caixa (espelha o domínio da API). */
export const CATEGORIAS_RECEITA: CategoriaLancamento[] = [
  CategoriaLancamento.CONSULTA,
  CategoriaLancamento.AVALIACAO_AVULSA,
  CategoriaLancamento.VENDA_PRODUTO,
  CategoriaLancamento.CONSULTORIA,
];

/** Categorias válidas como saída de caixa. */
export const CATEGORIAS_DESPESA: CategoriaLancamento[] = [
  CategoriaLancamento.COMPRA_PRODUTO,
  CategoriaLancamento.INSUMO,
  CategoriaLancamento.ALUGUEL,
  CategoriaLancamento.CONTA_FIXA,
  CategoriaLancamento.DESPESA_EVENTUAL,
];

/** `OUTRO` serve aos dois lados, por isso não está em nenhuma das listas. */
export function categoriasDoTipo(tipo: TipoLancamento): CategoriaLancamento[] {
  const base = tipo === TipoLancamento.RECEITA ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  return [...base, CategoriaLancamento.OUTRO];
}

// ---------- Tabela de preços ----------

export enum TipoServico {
  CONSULTA = 'consulta',
  AVALIACAO_AVULSA = 'avaliacao_avulsa',
  CONSULTORIA = 'consultoria',
  OUTRO = 'outro',
}

export const TIPO_SERVICO_LABEL: Record<TipoServico, string> = {
  [TipoServico.CONSULTA]: 'Consulta',
  [TipoServico.AVALIACAO_AVULSA]: 'Avaliação avulsa de ferida',
  [TipoServico.CONSULTORIA]: 'Consultoria',
  [TipoServico.OUTRO]: 'Outro',
};

export interface Servico {
  id: string;
  clinicaId: string;
  nome: string;
  tipo: TipoServico;
  preco: number;
  descricao?: string;
  ativo: boolean;
  criadoEm: string;
}

/** Serviço → categoria sugerida no lançamento. */
export const CATEGORIA_DO_SERVICO: Record<TipoServico, CategoriaLancamento> = {
  [TipoServico.CONSULTA]: CategoriaLancamento.CONSULTA,
  [TipoServico.AVALIACAO_AVULSA]: CategoriaLancamento.AVALIACAO_AVULSA,
  [TipoServico.CONSULTORIA]: CategoriaLancamento.CONSULTORIA,
  [TipoServico.OUTRO]: CategoriaLancamento.OUTRO,
};

// ---------- Clientes institucionais (consultoria B2B) ----------

export enum TipoInstituicao {
  HOSPITAL = 'hospital',
  CLINICA = 'clinica',
  ILPI = 'ilpi',
  OUTRO = 'outro',
}

export const TIPO_INSTITUICAO_LABEL: Record<TipoInstituicao, string> = {
  [TipoInstituicao.HOSPITAL]: 'Hospital',
  [TipoInstituicao.CLINICA]: 'Clínica',
  [TipoInstituicao.ILPI]: 'ILPI (longa permanência)',
  [TipoInstituicao.OUTRO]: 'Outro',
};

export interface Instituicao {
  id: string;
  clinicaId: string;
  nome: string;
  tipo: TipoInstituicao;
  cnpj?: string;
  contatoNome?: string;
  contatoEmail?: string;
  contatoTelefone?: string;
  observacoes?: string;
  ativo: boolean;
  criadoEm: string;
}

// ---------- Recorrências (contrato de consultoria / aluguel / conta fixa) ----------

export interface Recorrencia {
  id: string;
  clinicaId: string;
  descricao: string;
  tipo: TipoLancamento;
  categoria: CategoriaLancamento;
  instituicaoId?: string;
  valorMensal: number;
  diaVencimento: number;
  inicio: string;
  fim?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface Lancamento {
  id: string;
  clinicaId: string;
  pacienteId?: string;
  agendamentoId?: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  formaPagamento?: FormaPagamento;
  status: StatusLancamento;
  vencimento?: string;
  recebidoEm?: string;
  observacoes?: string;
  categoria?: CategoriaLancamento;
  servicoId?: string;
  produtoId?: string;
  quantidade?: number;
  instituicaoId?: string;
  recorrenciaId?: string;
  /** Mês de referência `YYYY-MM` — só em lançamento vindo de recorrência. */
  competencia?: string;
  criadoPor: string;
  criadoEm: string;
}

export interface DashboardFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  totalPendente: number;
  saldo: number;
  porFormaPagamento: Array<{ forma: string; total: number; quantidade: number }>;
  porCategoria: Array<{ categoria: string; tipo: TipoLancamento; total: number; quantidade: number }>;
  serieMensal: Array<{ mes: string; receitas: number; despesas: number }>;
}

// ---------- Indicadores operacionais (analytics) ----------

/** Agregação do Mongo: `_id` é a chave do $group. */
export interface ContagemPorChave {
  _id: string | null;
  total: number;
}

export interface ContagemPorMes {
  _id: { ano: number; mes: number };
  total: number;
}

export interface IndicadoresPacientes {
  totalAtivos: number;
  novosPorMes: ContagemPorMes[];
  porSexo: ContagemPorChave[];
}

export interface IndicadoresAgendamentos {
  porStatus: ContagemPorChave[];
  porTipo: ContagemPorChave[];
  /** Campo de origem ainda se chama `medicoId` no schema; hoje guarda o enfermeiro. */
  topProfissionais: ContagemPorChave[];
  porMes: ContagemPorMes[];
}

export interface IndicadoresNotificacoes {
  porStatus: ContagemPorChave[];
  porCanal: Array<{ _id: string | null; total: number; enviados: number }>;
  porTipo: ContagemPorChave[];
  /** Percentual inteiro 0-100. */
  taxaEntrega: number;
}

export interface LinhaFonteReceita {
  categoria: string;
  total: number;
  quantidade: number;
  ticketMedio: number;
}

export interface RelatorioFinanceiro {
  periodo: { inicio: string; fim: string };
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  totalPendente: number;
  fontesReceita: LinhaFonteReceita[];
  despesasPorCategoria: LinhaFonteReceita[];
  porInstituicao: Array<{ instituicaoId: string; nome: string; total: number; quantidade: number }>;
  /**
   * `custoTotal`/`margem` só vêm quando TODAS as vendas do produto no período
   * tinham custo registrado — margem parcial pareceria lucro real.
   */
  produtosVendidos: Array<{
    produtoId: string;
    nome: string;
    quantidade: number;
    total: number;
    custoTotal?: number;
    margem?: number;
  }>;
  serieMensal: Array<{ mes: string; receitas: number; despesas: number }>;
}

// ---------- Telemedicina ----------
export enum StatusSala {
  AGUARDANDO = 'aguardando',
  EM_ANDAMENTO = 'em_andamento',
  ENCERRADA = 'encerrada',
  EXPIRADA = 'expirada',
}

export const STATUS_SALA_LABEL: Record<StatusSala, string> = {
  [StatusSala.AGUARDANDO]: 'Aguardando',
  [StatusSala.EM_ANDAMENTO]: 'Em andamento',
  [StatusSala.ENCERRADA]: 'Encerrada',
  [StatusSala.EXPIRADA]: 'Expirada',
};

export const STATUS_SALA_COLOR: Record<StatusSala, string> = {
  [StatusSala.AGUARDANDO]: 'blue',
  [StatusSala.EM_ANDAMENTO]: 'green',
  [StatusSala.ENCERRADA]: 'default',
  [StatusSala.EXPIRADA]: 'red',
};

export interface SalaTelemedicina {
  id: string;
  clinicaId: string;
  agendamentoId: string;
  medicoId: string;
  modalidade: ModalidadeAtendimento;
  pacienteId: string;
  status: StatusSala;
  tokenMedico: string;
  tokenPaciente: string;
  expiresAt: string;
  iniciadaEm?: string;
  encerradaEm?: string;
  criadoEm: string;
}

export enum PapelSala {
  PROFISSIONAL = 'profissional',
  PACIENTE = 'paciente',
}

export const PAPEL_SALA_LABEL: Record<PapelSala, string> = {
  [PapelSala.PROFISSIONAL]: 'Profissional',
  [PapelSala.PACIENTE]: 'Paciente',
};

export enum TipoEventoSala {
  ENTROU = 'entrou',
  SAIU = 'saiu',
  DESCONECTOU = 'desconectou',
  RECONECTOU = 'reconectou',
  FALHA_CONEXAO = 'falha_conexao',
  MIDIA_NEGADA = 'midia_negada',
  ENCERRADA = 'encerrada',
}

export const TIPO_EVENTO_SALA_LABEL: Record<TipoEventoSala, string> = {
  [TipoEventoSala.ENTROU]: 'Entrou na sala',
  [TipoEventoSala.SAIU]: 'Saiu da sala',
  [TipoEventoSala.DESCONECTOU]: 'Conexão perdida',
  [TipoEventoSala.RECONECTOU]: 'Reconectou',
  [TipoEventoSala.FALHA_CONEXAO]: 'Falha de conexão',
  [TipoEventoSala.MIDIA_NEGADA]: 'Câmera/microfone negados',
  [TipoEventoSala.ENCERRADA]: 'Atendimento encerrado',
};

export interface SalaEvento {
  id: string;
  clinicaId: string;
  salaId: string;
  papel: PapelSala;
  tipo: TipoEventoSala;
  detalhes?: string;
  criadoEm: string;
}

/** Estado da sala visto por quem entra com o token (sem dados sensíveis). */
export interface SalaAcessoInfo {
  salaId: string;
  papel: PapelSala;
  status: StatusSala;
  modalidade: ModalidadeAtendimento;
  expiresAt: string;
  iniciadaEm?: string;
  encerradaEm?: string;
}

export enum TipoSinal {
  /** Paciente anuncia presença; o profissional responde com uma (re)oferta. */
  PRONTO = 'pronto',
  OFFER = 'offer',
  ANSWER = 'answer',
  CANDIDATE = 'candidate',
  BYE = 'bye',
}

export interface SinalSala {
  id: string;
  salaId: string;
  de: PapelSala;
  tipo: TipoSinal;
  payload: unknown;
  criadoEm: string;
}

export interface ObservacaoPaciente {
  id: string;
  clinicaId: string;
  pacienteId: string;
  autorId: string;
  autorEmail: string;
  texto: string;
  criadoEm: string;
}


// ---------- Catálogo de produtos para ferida ----------

export enum TipoProduto {
  CURATIVO = 'curativo',
  COBERTURA = 'cobertura',
  BOLSA_ESTOMIA = 'bolsa_estomia',
  ADJUVANTE = 'adjuvante',
  OUTRO = 'outro',
}

export const TIPO_PRODUTO_LABEL: Record<TipoProduto, string> = {
  [TipoProduto.CURATIVO]: 'Curativo',
  [TipoProduto.COBERTURA]: 'Cobertura',
  [TipoProduto.BOLSA_ESTOMIA]: 'Bolsa de estomia',
  [TipoProduto.ADJUVANTE]: 'Adjuvante',
  [TipoProduto.OUTRO]: 'Outro',
};

export interface Produto {
  id: string;
  clinicaId: string;
  nome: string;
  codigo?: string;
  /** Categoria clínica (Hidrocoloide, Espuma, Alginato...) — o nome é a marca comercial. */
  subcategoria?: string;
  tipo: TipoProduto;
  precoVenda: number;
  custo?: number;
  unidade?: string;
  apresentacao?: string;
  fabricante?: string;
  observacoes?: string;
  ativo: boolean;
  criadoEm: string;
}

// ---------- Termo de consentimento (fotografia/pesquisa) ----------
export enum TipoTermo {
  FOTOGRAFIA_PESQUISA = 'fotografia_pesquisa',
}

export const TIPO_TERMO_LABEL: Record<TipoTermo, string> = {
  [TipoTermo.FOTOGRAFIA_PESQUISA]: 'Fotografia da lesão e uso em pesquisa científica',
};

export interface AssinaturaTermo {
  nomeAssinante: string;
  dataAssinatura: string;
  hash: string;
  assinadoPor: string;
}

export interface TermoConsentimento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  tipo: TipoTermo;
  versaoTexto: string;
  texto: string;
  assinatura?: AssinaturaTermo;
  criadoPor: string;
  criadoPorNome: string;
  criadoPorRegistro?: string;
  criadoEm: string;
}

// ---------- Receituário de enfermagem (insumos de curativo) ----------
export interface ItemReceituario {
  produtoId?: string;
  nome: string;
  quantidade: number;
  instrucoesUso: string;
}

export interface ReceituarioEnfermagem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  feridaId?: string;
  enfermeiroId: string;
  itens: ItemReceituario[];
  observacoes?: string;
  criadoEm: string;
}

// ---------- Super Admin ----------
export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  clinicaId?: string | null;
  ativo: boolean;
  criadoEm: string;
  registroProfissional?: string;
  permissoes?: Modulo[];
  modulosConcedidos?: Modulo[];
  modulosRevogados?: Modulo[];
}

export interface ListUsuariosResult {
  items: UsuarioAdmin[];
  total: number;
  skip: number;
  limit: number;
}
