import { CategoriaLancamento, TipoLancamento } from './lancamento.entity';

/**
 * Cobranca/pagamento que se repete todo mes, com um motor unico para os dois
 * lados do caixa:
 *  - RECEITA: contrato de consultoria com hospital/clinica/ILPI.
 *  - DESPESA: aluguel e contas fixas (energia, internet, software...).
 *
 * A recorrencia nao guarda dinheiro — ela e a REGRA. O dinheiro vive nos
 * `Lancamento` que ela materializa, um por competencia (mes de referencia).
 * Assim o fluxo de caixa, os relatorios e o "marcar como recebido/pago"
 * funcionam igual para lancamento avulso e para recorrente, sem caso especial.
 */
export interface Recorrencia {
  id: string;
  clinicaId: string;
  descricao: string;
  tipo: TipoLancamento;
  categoria: CategoriaLancamento;
  /** Obrigatorio quando a recorrencia e um contrato de consultoria. */
  instituicaoId?: string;
  valorMensal: number;
  /** Dia do mes usado como vencimento de cada competencia (1-28). */
  diaVencimento: number;
  /** Primeira competencia (o dia da data e ignorado). */
  inicio: Date;
  /** Ultima competencia, inclusive. Ausente = vigente por prazo indeterminado. */
  fim?: Date;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm?: Date;
}

/** Competencia no formato `YYYY-MM` — chave de idempotencia da materializacao. */
export type Competencia = string;

export function competenciaDe(data: Date): Competencia {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Dia 29-31 nao existe em todo mes; o cadastro limita a 28 mas dados legados
 * (ou vindos de fora) podem trazer outro valor — entao o vencimento e sempre
 * fixado no ultimo dia valido do mes em questao.
 */
export function vencimentoDaCompetencia(competencia: Competencia, diaVencimento: number): Date {
  const [ano, mes] = competencia.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return new Date(ano, mes - 1, Math.min(Math.max(diaVencimento, 1), ultimoDia));
}

/**
 * Competencias que a recorrencia deveria ter gerado ate `ate` (normalmente
 * hoje). Funcao pura — o repositorio decide quais ainda nao existem no banco.
 *
 * Nao gera nada no futuro: o mes corrente entra, os proximos nao. Uma
 * recorrencia cadastrada com inicio retroativo materializa o historico todo de
 * uma vez, que e o comportamento esperado ao cadastrar um contrato antigo.
 */
export function competenciasDevidas(recorrencia: Recorrencia, ate: Date): Competencia[] {
  if (!recorrencia.ativo) return [];

  const limite = recorrencia.fim && recorrencia.fim < ate ? recorrencia.fim : ate;
  const competencias: Competencia[] = [];

  const cursor = new Date(recorrencia.inicio.getFullYear(), recorrencia.inicio.getMonth(), 1);
  const fim = new Date(limite.getFullYear(), limite.getMonth(), 1);

  while (cursor <= fim) {
    competencias.push(competenciaDe(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return competencias;
}
