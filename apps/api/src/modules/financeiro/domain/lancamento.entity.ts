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
 * Categoria do lancamento na realidade de uma clinica de estomaterapia.
 *
 * ENTRADAS — as quatro fontes de receita do negocio: consulta presencial,
 * avaliacao avulsa de ferida, venda de produto para ferida e consultoria a
 * hospitais/clinicas/ILPI.
 *
 * SAIDAS — insumos, aluguel, contas fixas, compra de produto para revenda e
 * saidas esporadicas.
 */
export enum CategoriaLancamento {
  // Entradas
  CONSULTA = 'consulta',
  AVALIACAO_AVULSA = 'avaliacao_avulsa',
  VENDA_PRODUTO = 'venda_produto',
  CONSULTORIA = 'consultoria',
  // Saidas
  COMPRA_PRODUTO = 'compra_produto',
  INSUMO = 'insumo',
  ALUGUEL = 'aluguel',
  CONTA_FIXA = 'conta_fixa',
  DESPESA_EVENTUAL = 'despesa_eventual',
  // Neutro
  OUTRO = 'outro',
}

/** Categorias que so fazem sentido como entrada de caixa. */
export const CATEGORIAS_RECEITA: CategoriaLancamento[] = [
  CategoriaLancamento.CONSULTA,
  CategoriaLancamento.AVALIACAO_AVULSA,
  CategoriaLancamento.VENDA_PRODUTO,
  CategoriaLancamento.CONSULTORIA,
];

/** Categorias que so fazem sentido como saida de caixa. */
export const CATEGORIAS_DESPESA: CategoriaLancamento[] = [
  CategoriaLancamento.COMPRA_PRODUTO,
  CategoriaLancamento.INSUMO,
  CategoriaLancamento.ALUGUEL,
  CategoriaLancamento.CONTA_FIXA,
  CategoriaLancamento.DESPESA_EVENTUAL,
];

/**
 * `OUTRO` serve aos dois lados de proposito (sobra para o que nao se encaixa),
 * por isso nao aparece em nenhuma das duas listas acima.
 */
export function categoriaCompativelCom(categoria: CategoriaLancamento, tipo: TipoLancamento): boolean {
  if (categoria === CategoriaLancamento.OUTRO) return true;
  return tipo === TipoLancamento.RECEITA
    ? CATEGORIAS_RECEITA.includes(categoria)
    : CATEGORIAS_DESPESA.includes(categoria);
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
  /** Servico da tabela de precos que originou o valor (consulta, avaliacao...). */
  servicoId?: string;
  /** Produto do catalogo vinculado (venda/compra de produto). */
  produtoId?: string;
  quantidade?: number;
  /** Cliente institucional da consultoria. */
  instituicaoId?: string;
  /** Recorrencia que materializou este lancamento (contrato, aluguel, conta fixa). */
  recorrenciaId?: string;
  /** Mes de referencia `YYYY-MM` — so em lancamento vindo de recorrencia. */
  competencia?: string;
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
  /** Efetivado por categoria no periodo — base do grafico de composicao. */
  porCategoria: Array<{ categoria: string; tipo: TipoLancamento; total: number; quantidade: number }>;
  /** Ultimos 12 meses (independe do filtro de periodo): grafico entrada x saida. */
  serieMensal: Array<{ mes: string; receitas: number; despesas: number }>;
}

/** Uma linha do relatorio por fonte de receita (as 4 do negocio). */
export interface LinhaFonteReceita {
  categoria: string;
  total: number;
  quantidade: number;
  /** total / quantidade — quanto rende, em media, cada cobranca da fonte. */
  ticketMedio: number;
}

export interface RelatorioFinanceiro {
  periodo: { inicio: Date; fim: Date };
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  totalPendente: number;
  /** Receita por fonte, maior primeiro. */
  fontesReceita: LinhaFonteReceita[];
  /** Despesa por categoria, maior primeiro. */
  despesasPorCategoria: LinhaFonteReceita[];
  /** Faturamento por cliente institucional (consultoria). */
  porInstituicao: Array<{ instituicaoId: string; nome: string; total: number; quantidade: number }>;
  /** Produtos mais vendidos no periodo. */
  produtosVendidos: Array<{ produtoId: string; nome: string; quantidade: number; total: number }>;
  /** Entrada x saida mes a mes dentro do periodo filtrado. */
  serieMensal: Array<{ mes: string; receitas: number; despesas: number }>;
}
