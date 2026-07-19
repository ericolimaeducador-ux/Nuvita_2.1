export enum StatusLancamento {
  PENDENTE = 'pendente',
  RECEBIDO = 'recebido',
  CANCELADO = 'cancelado',
}

export enum TipoLancamento {
  RECEITA = 'receita',
  DESPESA = 'despesa',
}

export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  CARTAO_CREDITO = 'cartao_credito',
  CARTAO_DEBITO = 'cartao_debito',
  PIX = 'pix',
  TRANSFERENCIA = 'transferencia',
  CONVENIO = 'convenio',
  BOLETO = 'boleto',
}

/**
 * De onde veio o lançamento. O financeiro geral (urologia, clínica) e o
 * financeiro do psicólogo autônomo compartilham o mesmo livro-caixa, mas cada
 * um só enxerga a sua origem.
 */
export enum OrigemLancamento {
  GERAL = 'geral',
  PSICOLOGIA = 'psicologia',
}

/**
 * Categoria do lançamento na realidade da estomaterapia: recebimento de
 * consulta, venda de produto (curativos, coberturas, bolsas) ao paciente e
 * compra de produto para revenda/estoque. Alimenta os gráficos e o relatório.
 */
export enum CategoriaLancamento {
  CONSULTA = 'consulta',
  VENDA_PRODUTO = 'venda_produto',
  COMPRA_PRODUTO = 'compra_produto',
  OUTRO = 'outro',
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
  vencimento?: Date;
  recebidoEm?: Date;
  observacoes?: string;
  origem: OrigemLancamento;
  categoria?: CategoriaLancamento;
  /** Produto do catálogo vinculado (venda/compra de produto). */
  produtoId?: string;
  quantidade?: number;
  /** Profissional dono do recebimento (psicólogo autônomo). */
  profissionalId?: string;
  /** Ciclo de sessões que esta cobrança paga (psicologia). */
  ciclo?: number;
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm?: Date;
}

export interface DashboardFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  totalPendente: number;
  saldo: number;
  porFormaPagamento: Array<{ forma: string; total: number; quantidade: number }>;
  /** Recebido/pago por categoria no período (consulta, venda, compra, outro). */
  porCategoria: Array<{ categoria: string; tipo: TipoLancamento; total: number; quantidade: number }>;
  /** Últimos 12 meses (independe do filtro de período): base do gráfico entrada×saída. */
  serieMensal: Array<{ mes: string; receitas: number; despesas: number }>;
}
