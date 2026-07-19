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
 * Categoria do lançamento na realidade de uma clínica de estomaterapia:
 * consulta presencial, atendimento avulso por telemedicina, venda/compra de
 * produto (curativos, coberturas, bolsas) e consultoria prestada a hospitais
 * e clínicas de idosos. Alimenta os gráficos e o relatório do dashboard.
 */
export enum CategoriaLancamento {
  CONSULTA = 'consulta',
  TELEMEDICINA_AVULSA = 'telemedicina_avulsa',
  VENDA_PRODUTO = 'venda_produto',
  COMPRA_PRODUTO = 'compra_produto',
  CONSULTORIA = 'consultoria',
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
  categoria?: CategoriaLancamento;
  /** Produto do catálogo vinculado (venda/compra de produto). */
  produtoId?: string;
  quantidade?: number;
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
  /** Recebido/pago por categoria no período (consulta, telemedicina avulsa, venda/compra de produto, consultoria, outro). */
  porCategoria: Array<{ categoria: string; tipo: TipoLancamento; total: number; quantidade: number }>;
  /** Últimos 12 meses (independe do filtro de período): base do gráfico entrada×saída. */
  serieMensal: Array<{ mes: string; receitas: number; despesas: number }>;
}
