export enum NivelExsudato {
  NENHUM = 'nenhum',
  BAIXO = 'baixo',
  MODERADO = 'moderado',
  ALTO = 'alto',
}

export enum NivelRisco {
  BAIXO = 'baixo',
  MODERADO = 'moderado',
  ALTO = 'alto',
  URGENTE = 'urgente',
}

export enum AchadoPerilesional {
  ERITEMA = 'eritema',
  MACERACAO = 'maceracao',
  EDEMA = 'edema',
  CALOR = 'calor',
  DERMATITE = 'dermatite',
  INDURACAO = 'induracao',
  CREPITACAO = 'crepitacao',
}

export interface Medicao {
  comprimentoCm: number;
  larguraCm: number;
  profundidadeCm: number;
  areaCm2?: number;
}

/** Soma dos 4 percentuais não pode exceder 100 — validado na service (espelha o model_validator do Pydantic). */
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
  /** Sempre true — nunca vem do DTO de entrada, é atribuído pelo motor clínico. */
  exigeRevisaoHumana: true;
}

/**
 * Imutável por construção: sem update/delete no port do repositório
 * (application/ports/avaliacao-ferida.repository.ts) nem no controller —
 * uma correção clínica é uma nova avaliação, nunca uma edição da anterior.
 */
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
  /** Versão do motor de risco que gerou as recomendações (= ENGINE_VERSION), permite auditar regras passadas mesmo após a lógica evoluir. */
  motorClinico: string;
  criadoEm: Date;
}

export interface PontoTimelineFerida {
  avaliacaoId: string;
  criadoEm: Date;
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

export type TendenciaFerida = 'melhorando' | 'piorando' | 'estavel';

export interface TimelineFerida {
  pontos: PontoTimelineFerida[];
  tendencia: { status: TendenciaFerida };
}
