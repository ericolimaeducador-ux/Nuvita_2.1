import { CATALOGO_CLINICO_VERSAO, TaxonomiaTermo, TipoAcao } from './catalogo-clinico.entity';

export { CATALOGO_CLINICO_VERSAO };

export enum PrioridadeDiagnostico {
  ALTA = 'ALTA',
  MEDIA = 'MEDIA',
  BAIXA = 'BAIXA',
}

export enum StatusDiagnostico {
  CONFIRMADO = 'CONFIRMADO',
  HIPOTESE_PROVISORIA = 'HIPOTESE_PROVISORIA',
}

export enum StatusPlano {
  ATIVO = 'ativo',
  ENCERRADO = 'encerrado',
  SUSPENSO = 'suspenso',
}

export enum NivelCuidado {
  UTI = 'uti',
  ENFERMARIA = 'enfermaria',
  AMBULATORIO = 'ambulatorio',
  DOMICILIO = 'domicilio',
}

/** Decisão do enfermeiro na reavaliação de cada diagnóstico. */
export enum DecisaoEvolucao {
  /** Manter diagnóstico + manter prescrição. */
  A = 'A',
  /** Manter diagnóstico + modificar prescrição. */
  B = 'B',
  /** Modificar diagnóstico + modificar prescrição. */
  C = 'C',
  /** Encerrar diagnóstico (meta atingida). */
  D = 'D',
}

export enum UrgenciaAcao {
  IMEDIATA = 'IMEDIATA',
  CURTO_PRAZO = 'CURTO_PRAZO',
  ROTINA = 'ROTINA',
}

export interface DiagnosticoEnfermagem {
  prioridade: PrioridadeDiagnostico;
  codigoFenomeno: string;
  enunciado: string;
  relacionadoA: string[];
  evidenciadoPor: string[];
  status: StatusDiagnostico;
  raciocinioClinico: string;
  /** Procedência do termo — enquanto for LOCAL_PROVISORIO não se diz "CIPE®". */
  taxonomia: TaxonomiaTermo;
}

export interface IndicadorMeta {
  descricao: string;
  valorBaseline: string;
  valorMeta: string;
  metodoAvaliacao: string;
  frequencia: string;
}

export interface ResultadoEsperado {
  diagnosticoRef: string;
  codigo: string;
  titulo: string;
  /** Escala Likert 1-5: 1 = muito comprometido, 5 = não comprometido. */
  escoreBaseline: number;
  justificativaBaseline?: string;
  escoreMeta: number;
  prazo: string;
  indicadores: IndicadorMeta[];
  taxonomia: TaxonomiaTermo;
}

export interface AtividadePrescrita {
  descricao: string;
  frequencia: string;
  responsavel: string;
  registro: string;
}

export interface AcaoPrescrita {
  codigo: string;
  titulo: string;
  tipo: TipoAcao;
  urgencia: UrgenciaAcao;
  atividades: AtividadePrescrita[];
  alertasReavaliacao: string[];
  taxonomia: TaxonomiaTermo;
}

export interface Prescricao {
  diagnosticoRef: string;
  resultadoRef: string;
  acoes: AcaoPrescrita[];
  orientacoesPacienteCuidador: string[];
}

export interface DecisaoDiagnostico {
  diagnosticoRef: string;
  decisao: DecisaoEvolucao;
  justificativa: string;
  escoreAnterior: number;
  escoreAtual: number;
  progressoPct?: number;
}

export interface NotaSoap {
  s: string;
  o: string;
  a: string;
  p: string;
}

/**
 * Evolução do plano. Append-only por desenho: o histórico clínico não se
 * corrige, se acrescenta — mesmo princípio do prontuário assinado e do TCLE.
 */
export interface EvolucaoPlano {
  data: Date;
  enfermeiroId: string;
  relatoTexto: string;
  decisoes: DecisaoDiagnostico[];
  textoSoap: NotaSoap;
  novosFenomenos: { titulo: string; justificativa: string }[];
}

/** Rastreabilidade de cada chamada de IA que compôs o plano. */
export interface RegistroAuditoriaIa {
  skill: string;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  em: Date;
}

export interface PlanoCuidados {
  id: string;
  pacienteId: string;
  clinicaId: string;
  enfermeiroId: string;

  historicoTexto: string;
  exameFisicoTexto?: string;
  nivelCuidado?: NivelCuidado;
  /** Integra com o módulo de feridas existente, sem acoplar os domínios. */
  avaliacaoFeridaId?: string;

  dadosEstruturados: Record<string, unknown>;
  diagnosticos: DiagnosticoEnfermagem[];
  resultadosEsperados: ResultadoEsperado[];
  prescricoes: Prescricao[];
  evolucoes: EvolucaoPlano[];

  status: StatusPlano;
  versaoCatalogo: string;

  /**
   * Prova de integridade (HMAC), NÃO assinatura digital — mesma distinção que
   * vale para prontuário e TCLE. Assinatura com validade jurídica plena exige
   * ICP-Brasil.
   */
  hashIntegridade?: string;

  auditoriaIa: RegistroAuditoriaIa[];
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Todo plano gerado com apoio de IA exige revisão do enfermeiro antes de
 * qualquer uso assistencial. Mesmo contrato já usado em `recomendacoes` da
 * avaliação de ferida (`exigeRevisaoHumana: true`).
 */
export const PLANO_EXIGE_REVISAO_HUMANA = true as const;
