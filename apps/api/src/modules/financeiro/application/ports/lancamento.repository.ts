import {
  CategoriaLancamento,
  DashboardFinanceiro,
  FormaPagamento,
  Lancamento,
  RelatorioFinanceiro,
  StatusLancamento,
  TipoLancamento,
} from '../../domain/lancamento.entity';

export interface CreateLancamentoInput {
  clinicaId: string;
  pacienteId?: string;
  agendamentoId?: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  formaPagamento?: FormaPagamento;
  vencimento?: Date;
  observacoes?: string;
  categoria?: CategoriaLancamento;
  servicoId?: string;
  produtoId?: string;
  quantidade?: number;
  custoUnitario?: number;
  instituicaoId?: string;
  recorrenciaId?: string;
  competencia?: string;
  criadoPor: string;
}

export interface ListLancamentosInput {
  clinicaId: string;
  pacienteId?: string;
  agendamentoId?: string;
  tipo?: TipoLancamento;
  status?: StatusLancamento;
  categoria?: CategoriaLancamento;
  instituicaoId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface DashboardInput {
  clinicaId: string;
  dataInicio: Date;
  dataFim: Date;
}

export interface RelatorioInput {
  clinicaId: string;
  dataInicio: Date;
  dataFim: Date;
  categoria?: CategoriaLancamento;
  instituicaoId?: string;
}

export interface LancamentoRepository {
  create(input: CreateLancamentoInput): Promise<Lancamento>;
  findById(clinicaId: string, id: string): Promise<Lancamento | null>;
  list(input: ListLancamentosInput): Promise<Lancamento[]>;
  updateStatus(clinicaId: string, id: string, status: StatusLancamento, recebidoEm?: Date): Promise<Lancamento | null>;
  dashboard(input: DashboardInput): Promise<DashboardFinanceiro>;
  relatorio(input: RelatorioInput): Promise<RelatorioFinanceiro>;
  /** Competencias ja materializadas de uma recorrencia (para nao duplicar). */
  competenciasExistentes(clinicaId: string, recorrenciaId: string): Promise<string[]>;
}
