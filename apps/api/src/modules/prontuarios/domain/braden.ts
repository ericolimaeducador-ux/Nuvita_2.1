/**
 * Escala de Braden — risco de lesão por pressão.
 *
 * Calculada pelo servidor a partir das seis subescalas, nunca aceita pronta do
 * cliente. Mesmo racional das escalas de ferida (`feridas/domain/escalas.ts`):
 * escore que vai para registro clínico imutável não pode depender do que o
 * navegador mandou.
 *
 * A versão é persistida em cada registro para que pontuação antiga continue
 * auditável quando esta lógica evoluir — mesmo padrão de `escalas.versao`.
 *
 * ⚠️ PONTOS DE CORTE PENDENTES DE CONFIRMAÇÃO. A soma das subescalas (6 a 23) é
 * o próprio instrumento e não tem ambiguidade. Já as FAIXAS DE RISCO abaixo
 * variam conforme a fonte — há literatura que trata 16 como limiar de risco em
 * adultos e 18 em idosos ou pele escura. Conforme a hierarquia de fontes do
 * projeto, essas faixas precisam ser cruzadas com o material do curso
 * (Anatomia, Fundamentos, Cuidados com Estomas) antes de valerem como
 * definitivas. Até lá ficam marcadas aqui e sinalizadas na interface.
 */

export const BRADEN_VERSION = 'braden-0.1.0';

/** Confirmação clínica das faixas ainda não feita — ver aviso acima. */
export const BRADEN_FAIXAS_PENDENTES_CONFIRMACAO = true as const;

export enum BradenPercepcaoSensorial {
  TOTALMENTE_LIMITADO = 1,
  MUITO_LIMITADO = 2,
  LEVEMENTE_LIMITADO = 3,
  NENHUMA_LIMITACAO = 4,
}

export enum BradenUmidade {
  COMPLETAMENTE_MOLHADO = 1,
  MUITO_MOLHADO = 2,
  OCASIONALMENTE_MOLHADO = 3,
  RARAMENTE_MOLHADO = 4,
}

export enum BradenAtividade {
  ACAMADO = 1,
  CONFINADO_A_CADEIRA = 2,
  ANDA_OCASIONALMENTE = 3,
  ANDA_FREQUENTEMENTE = 4,
}

export enum BradenMobilidade {
  TOTALMENTE_IMOVEL = 1,
  BASTANTE_LIMITADO = 2,
  LEVEMENTE_LIMITADO = 3,
  NAO_APRESENTA_LIMITACOES = 4,
}

export enum BradenNutricao {
  MUITO_POBRE = 1,
  PROVAVELMENTE_INADEQUADA = 2,
  ADEQUADA = 3,
  EXCELENTE = 4,
}

/** Única subescala de 3 níveis — por isso o total mínimo é 6 e não 6x1 de 4 níveis. */
export enum BradenFriccaoCisalhamento {
  PROBLEMA = 1,
  PROBLEMA_EM_POTENCIAL = 2,
  NENHUM_PROBLEMA = 3,
}

export enum NivelRiscoBraden {
  SEM_RISCO = 'sem_risco',
  BAIXO = 'baixo',
  MODERADO = 'moderado',
  ALTO = 'alto',
  MUITO_ALTO = 'muito_alto',
}

export interface BradenSubescalas {
  percepcaoSensorial: BradenPercepcaoSensorial;
  umidade: BradenUmidade;
  atividade: BradenAtividade;
  mobilidade: BradenMobilidade;
  nutricao: BradenNutricao;
  friccaoCisalhamento: BradenFriccaoCisalhamento;
}

export interface BradenScore extends BradenSubescalas {
  /** 6 a 23. Menor = maior risco. */
  total: number;
  risco: NivelRiscoBraden;
  versao: string;
  /** `true` enquanto as faixas não forem cruzadas com o material do curso. */
  faixasPendentesConfirmacao: boolean;
}

export const BRADEN_TOTAL_MINIMO = 6;
export const BRADEN_TOTAL_MAXIMO = 23;

const SUBESCALAS_DE_QUATRO_NIVEIS = [
  'percepcaoSensorial',
  'umidade',
  'atividade',
  'mobilidade',
  'nutricao',
] as const;

/**
 * Faixas de risco. Menor escore = maior risco — o oposto do PUSH/RESVECH, onde
 * menor é melhor. Ver o aviso de pendência no topo do arquivo.
 */
export function classificarRiscoBraden(total: number): NivelRiscoBraden {
  if (total <= 9) return NivelRiscoBraden.MUITO_ALTO;
  if (total <= 12) return NivelRiscoBraden.ALTO;
  if (total <= 14) return NivelRiscoBraden.MODERADO;
  if (total <= 18) return NivelRiscoBraden.BAIXO;
  return NivelRiscoBraden.SEM_RISCO;
}

function valido(valor: unknown, maximo: number): boolean {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= maximo;
}

/**
 * Verdadeiro só quando as seis subescalas estão presentes e válidas.
 *
 * Braden parcial não vira escore: um total somado com subescala faltando seria
 * indistinguível de um paciente com escore realmente baixo, e a diferença
 * aqui é entre "não avaliado" e "risco muito alto".
 */
export function bradenCompleto(entrada: Partial<BradenSubescalas> | undefined): boolean {
  if (!entrada) return false;
  return (
    SUBESCALAS_DE_QUATRO_NIVEIS.every((chave) => valido(entrada[chave], 4)) &&
    valido(entrada.friccaoCisalhamento, 3)
  );
}

/**
 * Calcula o escore de Braden. Retorna `undefined` quando as subescalas não
 * estão completas — cabe a quem chama decidir o que fazer com isso.
 */
export function calcularBraden(
  entrada: Partial<BradenSubescalas> | undefined,
): BradenScore | undefined {
  if (!bradenCompleto(entrada)) return undefined;
  const s = entrada as BradenSubescalas;

  const total =
    s.percepcaoSensorial +
    s.umidade +
    s.atividade +
    s.mobilidade +
    s.nutricao +
    s.friccaoCisalhamento;

  return {
    ...s,
    total,
    risco: classificarRiscoBraden(total),
    versao: BRADEN_VERSION,
    faixasPendentesConfirmacao: BRADEN_FAIXAS_PENDENTES_CONFIRMACAO,
  };
}
