// Enums e tipos espelhados da API NestJS (packages/shared + domain entities).

export enum Papel {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MEDICO = 'MEDICO',
  ENFERMEIRO = 'ENFERMEIRO',
  ADVOGADO = 'ADVOGADO',
  PSICOLOGO = 'PSICOLOGO',
  SECRETARIA = 'SECRETARIA',
  PACIENTE = 'PACIENTE',
}

export const PAPEL_LABEL: Record<Papel, string> = {
  [Papel.SUPER_ADMIN]: 'Super Admin',
  [Papel.ADMIN]: 'Administrador',
  [Papel.MEDICO]: 'Médico(a)',
  [Papel.ENFERMEIRO]: 'Enfermeiro(a)',
  [Papel.ADVOGADO]: 'Advogado(a)',
  [Papel.PSICOLOGO]: 'Psicólogo(a)',
  [Papel.SECRETARIA]: 'Secretaria',
  [Papel.PACIENTE]: 'Paciente',
};

// Papéis profissionais que prestam atendimento (paridade de permissões clínicas).
export const PAPEIS_PROFISSIONAIS: Papel[] = [
  Papel.MEDICO,
  Papel.ENFERMEIRO,
  Papel.ADVOGADO,
  Papel.PSICOLOGO,
];

export enum ModalidadeAtendimento {
  MEDICO = 'medico',
  ENFERMAGEM = 'enfermagem',
  JURIDICO = 'juridico',
  PSICOLOGIA = 'psicologia',
}

export const MODALIDADE_LABEL: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.MEDICO]: 'Médico',
  [ModalidadeAtendimento.ENFERMAGEM]: 'Enfermagem',
  [ModalidadeAtendimento.JURIDICO]: 'Jurídico',
  [ModalidadeAtendimento.PSICOLOGIA]: 'Psicologia',
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

// Classificação interna por projeto (tipo de cateter). Os nomes dos
// fabricantes são propriedade intelectual e nunca aparecem no sistema —
// só os rótulos neutros Alpha/Beta.
export enum ProjetoPaciente {
  ALPHA = 'ALPHA',
  BETA = 'BETA',
  // Pacientes de atendimento psicológico — só aparecem para o papel PSICOLOGO
  // (o backend filtra); nunca aparecem para os demais profissionais.
  PSI = 'PSI',
}

export const PROJETO_LABEL: Record<ProjetoPaciente, string> = {
  [ProjetoPaciente.ALPHA]: 'Projeto Alpha',
  [ProjetoPaciente.BETA]: 'Projeto Beta',
  [ProjetoPaciente.PSI]: 'Projeto PSI (Psicologia)',
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
  CONSULTA = 'consulta',
  RETORNO = 'retorno',
  EXAME = 'exame',
  PROCEDIMENTO = 'procedimento',
  TELECONSULTA = 'teleconsulta',
  ATENDIMENTO_ENFERMAGEM = 'atendimento_enfermagem',
  PROCEDIMENTO_ENFERMAGEM = 'procedimento_enfermagem',
  ATENDIMENTO_JURIDICO = 'atendimento_juridico',
  AUDIENCIA = 'audiencia',
  ENTREVISTA = 'entrevista',
  AVALIACAO_PSICOLOGICA = 'avaliacao_psicologica',
  SESSAO_PSICOTERAPIA = 'sessao_psicoterapia',
}

export const TIPO_AGENDAMENTO_LABEL: Record<TipoAgendamento, string> = {
  [TipoAgendamento.CONSULTA]: 'Consulta',
  [TipoAgendamento.RETORNO]: 'Retorno',
  [TipoAgendamento.EXAME]: 'Exame',
  [TipoAgendamento.PROCEDIMENTO]: 'Procedimento',
  [TipoAgendamento.TELECONSULTA]: 'Teleconsulta',
  [TipoAgendamento.ATENDIMENTO_ENFERMAGEM]: 'Atend. Enfermagem',
  [TipoAgendamento.PROCEDIMENTO_ENFERMAGEM]: 'Proc. Enfermagem',
  [TipoAgendamento.ATENDIMENTO_JURIDICO]: 'Atend. Jurídico',
  [TipoAgendamento.AUDIENCIA]: 'Audiência',
  [TipoAgendamento.ENTREVISTA]: 'Entrevista (Fluxo Clínico)',
  [TipoAgendamento.AVALIACAO_PSICOLOGICA]: 'Avaliação Psicológica',
  [TipoAgendamento.SESSAO_PSICOTERAPIA]: 'Sessão de Psicoterapia',
};

// Tipos de agendamento sugeridos por modalidade (para filtrar o formulário).
export const TIPOS_POR_MODALIDADE: Record<ModalidadeAtendimento, TipoAgendamento[]> = {
  [ModalidadeAtendimento.MEDICO]: [
    TipoAgendamento.CONSULTA,
    TipoAgendamento.RETORNO,
    TipoAgendamento.EXAME,
    TipoAgendamento.PROCEDIMENTO,
    TipoAgendamento.TELECONSULTA,
  ],
  [ModalidadeAtendimento.ENFERMAGEM]: [
    TipoAgendamento.ATENDIMENTO_ENFERMAGEM,
    TipoAgendamento.PROCEDIMENTO_ENFERMAGEM,
    TipoAgendamento.ENTREVISTA,
  ],
  [ModalidadeAtendimento.JURIDICO]: [
    TipoAgendamento.ATENDIMENTO_JURIDICO,
    TipoAgendamento.AUDIENCIA,
  ],
  [ModalidadeAtendimento.PSICOLOGIA]: [
    TipoAgendamento.AVALIACAO_PSICOLOGICA,
    TipoAgendamento.SESSAO_PSICOTERAPIA,
  ],
};

export enum TipoAtendimento {
  CONSULTA = 'consulta',
  RETORNO = 'retorno',
  URGENCIA = 'urgencia',
  TELECONSULTA = 'teleconsulta',
  CONSULTA_ENFERMAGEM = 'consulta_enfermagem',
  PSICOTERAPIA = 'psicoterapia',
}

export const TIPO_ATENDIMENTO_LABEL: Record<TipoAtendimento, string> = {
  [TipoAtendimento.CONSULTA]: 'Consulta',
  [TipoAtendimento.RETORNO]: 'Retorno',
  [TipoAtendimento.URGENCIA]: 'Urgência',
  [TipoAtendimento.TELECONSULTA]: 'Teleconsulta',
  [TipoAtendimento.CONSULTA_ENFERMAGEM]: 'Consulta de Enfermagem',
  [TipoAtendimento.PSICOTERAPIA]: 'Atendimento Psicológico',
};

/** Mapeia o tipo de agendamento para o tipo de atendimento (prontuário) mais
 * próximo, usado para pré-preencher "Iniciar atendimento" a partir da agenda.
 * Tipos jurídicos (atendimento_juridico, audiencia) não têm prontuário clínico
 * equivalente — ficam de fora do mapa. */
export const TIPO_ATENDIMENTO_POR_AGENDAMENTO: Partial<Record<TipoAgendamento, TipoAtendimento>> = {
  [TipoAgendamento.CONSULTA]: TipoAtendimento.CONSULTA,
  [TipoAgendamento.RETORNO]: TipoAtendimento.RETORNO,
  [TipoAgendamento.EXAME]: TipoAtendimento.CONSULTA,
  [TipoAgendamento.PROCEDIMENTO]: TipoAtendimento.CONSULTA,
  [TipoAgendamento.TELECONSULTA]: TipoAtendimento.TELECONSULTA,
  [TipoAgendamento.ATENDIMENTO_ENFERMAGEM]: TipoAtendimento.CONSULTA_ENFERMAGEM,
  [TipoAgendamento.PROCEDIMENTO_ENFERMAGEM]: TipoAtendimento.CONSULTA_ENFERMAGEM,
  [TipoAgendamento.ENTREVISTA]: TipoAtendimento.CONSULTA_ENFERMAGEM,
  [TipoAgendamento.AVALIACAO_PSICOLOGICA]: TipoAtendimento.PSICOTERAPIA,
  [TipoAgendamento.SESSAO_PSICOTERAPIA]: TipoAtendimento.PSICOTERAPIA,
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
  ATENDIMENTO_PSICOLOGICO = 'ATENDIMENTO_PSICOLOGICO',
  FINANCEIRO_PSICOLOGIA = 'FINANCEIRO_PSICOLOGIA',
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
  [Modulo.ATENDIMENTO_PSICOLOGICO]: 'Atendimento psicológico',
  [Modulo.FINANCEIRO_PSICOLOGIA]: 'Financeiro da psicologia',
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
  [Papel.MEDICO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS, M.TELEMEDICINA,
    M.FERIDAS,
  ],
  [Papel.ENFERMEIRO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS,
    M.FERIDAS,
  ],
  [Papel.ADVOGADO]: [
    M.DASHBOARD, M.PACIENTES, M.PRONTUARIOS, M.DOCUMENTOS,
  ],
  // Atendimento psicológico é um extra: só o psicólogo enxerga por padrão;
  // outros usuários ganham por concessão individual no painel super-admin.
  // O financeiro da psicologia é o caixa do próprio psicólogo (autônomo) — não
  // se confunde com o M.FINANCEIRO da clínica, que ele não enxerga.
  [Papel.PSICOLOGO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS, M.TELEMEDICINA,
    M.ATENDIMENTO_PSICOLOGICO, M.FINANCEIRO_PSICOLOGIA,
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
  [Papel.MEDICO]: 'CRM',
  [Papel.ENFERMEIRO]: 'COREN',
  [Papel.ADVOGADO]: 'OAB',
  [Papel.PSICOLOGO]: 'CRP',
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
  programaIU?: boolean;
  projeto?: ProjetoPaciente;
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

export interface RegistroEnfermagem {
  dataLigacao?: string;
  sondaChegouEm?: string;
  observacoes?: string;
}

/** Registro de atendimento psicológico / psicoterapia (Res. CFP 006/2019). */
export interface RegistroPsicologico {
  motivoAtendimento?: string;
  avaliacaoDemanda?: string;
  doencasPrevias?: string;
  diagnosticosSaudeMental?: string;
  medicamentosEmUso?: string;
  historicoFamiliarSaudeMental?: string;
  qualidadeSono?: string;
  apetiteAlimentacao?: string;
  atividadeFisica?: string;
  usoSubstancias?: string;
  estadoEmocional?: string;
  escalaDor?: number;
  avaliacaoRisco?: string;
  redeApoio?: string;
  objetivosTrabalho?: string;
  procedimentoTecnica?: string;
  evolucao?: string;
  encaminhamentos?: string;
  anotacoesLivres?: string;
  crp?: string;
}

/** Ordem/rótulos de exibição do registro psicológico — usado no histórico de
 * sessões, no relatório e na impressão do prontuário de psicoterapia. */
export const REGISTRO_PSICOLOGICO_CAMPOS: Array<[keyof RegistroPsicologico, string]> = [
  ['motivoAtendimento', 'Motivo do atendimento'],
  ['avaliacaoDemanda', 'Avaliação de demanda'],
  ['doencasPrevias', 'Doenças prévias'],
  ['diagnosticosSaudeMental', 'Diagnósticos de saúde mental'],
  ['medicamentosEmUso', 'Medicamentos em uso'],
  ['historicoFamiliarSaudeMental', 'Histórico familiar de saúde mental'],
  ['qualidadeSono', 'Qualidade do sono'],
  ['apetiteAlimentacao', 'Apetite / alimentação'],
  ['atividadeFisica', 'Atividade física'],
  ['usoSubstancias', 'Uso de substâncias'],
  ['estadoEmocional', 'Estado emocional'],
  ['escalaDor', 'Dor (0-10)'],
  ['avaliacaoRisco', 'Avaliação de risco'],
  ['redeApoio', 'Rede de apoio'],
  ['objetivosTrabalho', 'Objetivos do acompanhamento'],
  ['procedimentoTecnica', 'Procedimento / técnica'],
  ['evolucao', 'Evolução'],
  ['encaminhamentos', 'Encaminhamentos'],
  ['anotacoesLivres', 'Anotações livres'],
  ['crp', 'CRP'],
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
  registroPsicologico?: RegistroPsicologico;
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

// Espelho de packages/shared/src/checklist-documentos/documentos-padrao.ts —
// usado como sugestão de nome ao anexar um documento.
export const DOCUMENTOS_PADRAO: string[] = [
  'RG ou CNH (documento de identificação com foto)',
  'Comprovante de endereço',
  'Comprovante de rendimentos',
  'Cópia da carteirinha do SUS',
  'Relatório médico',
  'Negativa administrativa',
];

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
  recomendacoes: RecomendacaoClinica[];
  motorClinico: string;
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
  criadoPor: string;
  criadoEm: string;
}

export interface DashboardFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  totalPendente: number;
  saldo: number;
  porFormaPagamento: Array<{ forma: string; total: number; quantidade: number }>;
}

// ---------- Financeiro da psicologia (psicólogo autônomo) ----------

/** O acompanhamento é vendido em pacotes fechados de sessões, pagos adiantado. */
export const SESSOES_POR_CICLO = 4;

export enum StatusCiclo {
  A_COBRAR = 'a_cobrar',
  AGUARDANDO_PAGAMENTO = 'aguardando_pagamento',
  EM_DIA = 'em_dia',
}

export const STATUS_CICLO_LABEL: Record<StatusCiclo, string> = {
  [StatusCiclo.A_COBRAR]: 'Cobrar ciclo',
  [StatusCiclo.AGUARDANDO_PAGAMENTO]: 'Aguardando pagamento',
  [StatusCiclo.EM_DIA]: 'Em dia',
};

export interface CobrancaCiclo {
  id: string;
  ciclo: number;
  valor: number;
  status: StatusLancamento;
  formaPagamento?: FormaPagamento;
  vencimento?: string;
  recebidoEm?: string;
  criadoEm: string;
}

export interface PacientePsicologia {
  pacienteId: string;
  pacienteNome?: string;
  sessoesRealizadas: number;
  proximaSessao: number;
  cicloAtual: number;
  sessoesNoCiclo: number;
  sessoesAteFecharCiclo: number;
  statusCiclo: StatusCiclo;
  valorEmAberto: number;
  primeiraSessaoEm?: string;
  ultimaSessaoEm?: string;
  cobrancas: CobrancaCiclo[];
}

export interface PainelPsicologia {
  valorSessao?: number;
  sessoesPorCiclo: number;
  recebidoNoMes: number;
  aReceber: number;
  ciclosACobrar: number;
  pacientes: PacientePsicologia[];
}

/** "1ª consulta" na estreia; depois, o número da sessão que vem. */
export function rotuloProximaSessao(p: { sessoesRealizadas: number; proximaSessao: number }): string {
  return p.sessoesRealizadas === 0 ? '1ª consulta' : `${p.proximaSessao}ª sessão`;
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

export enum StatusChecklistDocumento {
  PENDENTE = 'pendente',
  RECEBIDO = 'recebido',
}
export const STATUS_CHECKLIST_DOCUMENTO_LABEL: Record<StatusChecklistDocumento, string> = {
  [StatusChecklistDocumento.PENDENTE]: 'Pendente',
  [StatusChecklistDocumento.RECEBIDO]: 'Recebido',
};

export interface ChecklistDocumentoItem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  nome: string;
  status: StatusChecklistDocumento;
  observacao?: string;
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Produto {
  id: string;
  codigo: number;
  codigoFabricante?: string;
  nome: string;
  tipo: string;
  sexo: string;
  embalagem: string;
  projeto: 'ALPHA' | 'BETA';
  french?: number;
  comprimentoCm?: number;
  descricaoTecnica: string;
  descricaoSiafisico?: string;
  codigoSiafisico?: number;
  ativo: boolean;
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
