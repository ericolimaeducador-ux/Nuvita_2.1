import {
  AchadoPerilesional,
  Medicao,
  NivelExsudato,
  PerfilTecidual,
} from './avaliacao-ferida.entity';

/**
 * Escalas clínicas validadas de cicatrização, calculadas pelo servidor em
 * toda avaliação (nunca aceitas do cliente). Versão persistida em cada
 * avaliação — mesmo racional do ENGINE_VERSION do motor de risco: pontuações
 * antigas continuam auditáveis quando a lógica evoluir.
 *
 * - PUSH 3.0 (Pressure Ulcer Scale for Healing, NPUAP): 3 itens, total 0-17,
 *   menor = melhor. Calculável só com os dados que a avaliação já coleta.
 * - RESVECH 2.0: 6 itens, total 0-35, menor = melhor. Itens 2 (tecidos
 *   afetados) e 3 (bordas) dependem de campos próprios — o score só é
 *   calculado quando eles são informados; os sinais do item 6 combinam o que
 *   a avaliação já registra com a checklist opcional `SinalInfeccaoResvech`.
 */
export const ESCALAS_VERSION = 'escalas-clinicas-0.1.0';

// ─── PUSH 3.0 ────────────────────────────────────────────────────────────────

export interface PushScore {
  /** 0-10 conforme faixas oficiais de área (cm²). */
  area: number;
  /** 0-3: nenhum, pequeno, moderado, grande. */
  exsudato: number;
  /** 0-4: fechada, epitelização, granulação, esfacelo, necrose (pior tecido presente). */
  tipoTecido: number;
  /** 0-17. */
  total: number;
}

const PONTOS_EXSUDATO: Record<NivelExsudato, number> = {
  [NivelExsudato.NENHUM]: 0,
  [NivelExsudato.BAIXO]: 1,
  [NivelExsudato.MODERADO]: 2,
  [NivelExsudato.ALTO]: 3,
};

/** Faixas oficiais do PUSH 3.0: 0 | <0,3 | 0,3-0,6 | 0,7-1,0 | 1,1-2,0 | 2,1-3,0 | 3,1-4,0 | 4,1-8,0 | 8,1-12,0 | 12,1-24,0 | >24 cm². */
function pontuarAreaPush(areaCm2: number): number {
  if (areaCm2 <= 0) return 0;
  if (areaCm2 < 0.3) return 1;
  if (areaCm2 <= 0.6) return 2;
  if (areaCm2 <= 1.0) return 3;
  if (areaCm2 <= 2.0) return 4;
  if (areaCm2 <= 3.0) return 5;
  if (areaCm2 <= 4.0) return 6;
  if (areaCm2 <= 8.0) return 7;
  if (areaCm2 <= 12.0) return 8;
  if (areaCm2 <= 24.0) return 9;
  return 10;
}

/**
 * Pior tecido presente no leito (compartilhado por PUSH item 3 e RESVECH
 * item 4, que usam a mesma escala 0-4). Ferida com área zero conta como
 * fechada (0). Perfil todo zerado com ferida aberta pontua 1 (epitelização):
 * sem informação, registra-se o menor estado aberto em vez de inventar
 * gravidade — os alertas de segurança são papel do motor de risco, não da escala.
 */
function pontuarPiorTecido(tecido: PerfilTecidual, areaCm2: number): number {
  if (areaCm2 <= 0) return 0;
  if (tecido.necrosePct > 0) return 4;
  if (tecido.esfaceloPct > 0) return 3;
  if (tecido.granulacaoPct > 0) return 2;
  return 1;
}

export function calcularPush(medicao: Medicao, tecido: PerfilTecidual, exsudato: NivelExsudato): PushScore {
  const areaCm2 = medicao.areaCm2 ?? medicao.comprimentoCm * medicao.larguraCm;
  const area = pontuarAreaPush(areaCm2);
  const pontosExsudato = areaCm2 <= 0 ? 0 : PONTOS_EXSUDATO[exsudato];
  const tipoTecido = pontuarPiorTecido(tecido, areaCm2);
  return { area, exsudato: pontosExsudato, tipoTecido, total: area + pontosExsudato + tipoTecido };
}

// ─── RESVECH 2.0 ─────────────────────────────────────────────────────────────

/** Item 3 do RESVECH 2.0 — bordas da lesão (0-4, na ordem do enum). */
export enum BordasFerida {
  NAO_DISTINGUIVEIS = 'nao_distinguiveis',
  DIFUSAS = 'difusas',
  DELIMITADAS = 'delimitadas',
  DANIFICADAS = 'danificadas',
  ENGROSSADAS = 'engrossadas',
}

/** Item 2 do RESVECH 2.0 — tecido mais profundo afetado (0-4, na ordem do enum). */
export enum TecidosAfetados {
  PELE_INTACTA = 'pele_intacta',
  EPIDERME_DERME = 'epiderme_derme',
  SUBCUTANEO = 'subcutaneo',
  MUSCULO = 'musculo',
  OSSO_ANEXOS = 'osso_anexos',
}

/**
 * Sinais do item 6 (infecção/inflamação) que a avaliação ainda não registra
 * em outro campo — os demais (eritema, edema, calor, odor, exsudato alto,
 * estagnação, aumento de área) são derivados dos campos existentes.
 */
export enum SinalInfeccaoResvech {
  DOR_CRESCENTE = 'dor_crescente',
  EXSUDATO_PURULENTO = 'exsudato_purulento',
  TECIDO_FRIAVEL = 'tecido_friavel',
  BIOFILME_COMPATIVEL = 'biofilme_compativel',
  HIPERGRANULACAO = 'hipergranulacao',
  LESOES_SATELITE = 'lesoes_satelite',
  PALIDEZ_TECIDO = 'palidez_tecido',
}

export interface ResvechScore {
  /** 0-6 por faixa de área (cm²). */
  dimensao: number;
  /** 0-4 pelo tecido mais profundo afetado. */
  profundidade: number;
  /** 0-4 pelo estado das bordas. */
  bordas: number;
  /** 0-4 pelo pior tecido no leito (mesma régua do PUSH). */
  tecidoLeito: number;
  /** 0-3: seco, úmido, molhado, saturado. */
  exsudato: number;
  /** 0-14: um ponto por sinal presente de infecção/inflamação. */
  infeccaoInflamacao: number;
  /** 0-35. */
  total: number;
}

export interface CalcularResvechInput {
  medicao: Medicao;
  tecido: PerfilTecidual;
  exsudato: NivelExsudato;
  odor: boolean;
  achadosPerilesionais: AchadoPerilesional[];
  pioraAreaPct30Dias?: number;
  diasCicatrizacaoEstagnada?: number;
  bordas: BordasFerida;
  tecidosAfetados: TecidosAfetados;
  sinaisInfeccao?: SinalInfeccaoResvech[];
}

const PONTOS_BORDAS: Record<BordasFerida, number> = {
  [BordasFerida.NAO_DISTINGUIVEIS]: 0,
  [BordasFerida.DIFUSAS]: 1,
  [BordasFerida.DELIMITADAS]: 2,
  [BordasFerida.DANIFICADAS]: 3,
  [BordasFerida.ENGROSSADAS]: 4,
};

const PONTOS_TECIDOS_AFETADOS: Record<TecidosAfetados, number> = {
  [TecidosAfetados.PELE_INTACTA]: 0,
  [TecidosAfetados.EPIDERME_DERME]: 1,
  [TecidosAfetados.SUBCUTANEO]: 2,
  [TecidosAfetados.MUSCULO]: 3,
  [TecidosAfetados.OSSO_ANEXOS]: 4,
};

/** Faixas oficiais do RESVECH 2.0: 0 (cicatrizada) | <4 | 4-<16 | 16-<36 | 36-<64 | 64-<100 | ≥100 cm². */
function pontuarAreaResvech(areaCm2: number): number {
  if (areaCm2 <= 0) return 0;
  if (areaCm2 < 4) return 1;
  if (areaCm2 < 16) return 2;
  if (areaCm2 < 36) return 3;
  if (areaCm2 < 64) return 4;
  if (areaCm2 < 100) return 5;
  return 6;
}

/** Limiar alinhado à regra MODERATE_STALLED_HEALING do motor de risco — uma única definição de "estagnada" no produto. */
const DIAS_ESTAGNACAO_RESVECH = 28;

function contarSinaisInfeccao(input: CalcularResvechInput): number {
  const achados = new Set(input.achadosPerilesionais);
  const sinais = new Set(input.sinaisInfeccao ?? []);
  const derivados = [
    achados.has(AchadoPerilesional.ERITEMA),
    achados.has(AchadoPerilesional.EDEMA),
    achados.has(AchadoPerilesional.CALOR),
    input.odor,
    input.exsudato === NivelExsudato.ALTO,
    (input.diasCicatrizacaoEstagnada ?? 0) >= DIAS_ESTAGNACAO_RESVECH,
    (input.pioraAreaPct30Dias ?? 0) > 0,
  ];
  return derivados.filter(Boolean).length + sinais.size;
}

export function calcularResvech(input: CalcularResvechInput): ResvechScore {
  const areaCm2 = input.medicao.areaCm2 ?? input.medicao.comprimentoCm * input.medicao.larguraCm;
  const dimensao = pontuarAreaResvech(areaCm2);
  const profundidade = PONTOS_TECIDOS_AFETADOS[input.tecidosAfetados];
  const bordas = PONTOS_BORDAS[input.bordas];
  const tecidoLeito = pontuarPiorTecido(input.tecido, areaCm2);
  const exsudato = areaCm2 <= 0 ? 0 : PONTOS_EXSUDATO[input.exsudato];
  const infeccaoInflamacao = contarSinaisInfeccao(input);
  return {
    dimensao,
    profundidade,
    bordas,
    tecidoLeito,
    exsudato,
    infeccaoInflamacao,
    total: dimensao + profundidade + bordas + tecidoLeito + exsudato + infeccaoInflamacao,
  };
}

/** Persistido em cada avaliação; `resvech` ausente quando bordas/tecidosAfetados não foram informados. */
export interface EscalasClinicas {
  push: PushScore;
  resvech?: ResvechScore;
  versao: string;
}
