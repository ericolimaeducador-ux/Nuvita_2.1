import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateLancamentoInput,
  DashboardInput,
  LancamentoRepository,
  ListLancamentosInput,
  RelatorioInput,
} from '../../application/ports/lancamento.repository';
import {
  DashboardFinanceiro,
  Lancamento,
  LinhaFonteReceita,
  RelatorioFinanceiro,
  StatusLancamento,
  TipoLancamento,
} from '../../domain/lancamento.entity';
import { LancamentoDocument, LancamentoMongo } from './lancamento.schema';

/**
 * REGIME DE CAIXA. Todo agregado de valor EFETIVADO usa a data em que o dinheiro
 * de fato entrou/saiu (`recebidoEm`), nao a data em que o lancamento foi criado.
 * Sem isso, uma cobranca lancada em janeiro e paga em marco apareceria como
 * receita de janeiro, distorcendo o resultado do mes.
 *
 * `$ifNull` cobre registros marcados como recebidos antes de `recebidoEm`
 * existir/ser preenchido — nesses casos a criacao e a melhor aproximacao
 * disponivel, e o lancamento nao some do relatorio.
 */
const DATA_CAIXA = { $ifNull: ['$recebidoEm', '$criadoEm'] };

@Injectable()
export class LancamentoMongoRepository implements LancamentoRepository {
  constructor(
    @InjectModel(LancamentoMongo.name) private readonly model: Model<LancamentoDocument>,
  ) {}

  async create(input: CreateLancamentoInput): Promise<Lancamento> {
    const doc = await this.model.create({
      clinicaId: input.clinicaId,
      pacienteId: input.pacienteId,
      agendamentoId: input.agendamentoId,
      tipo: input.tipo,
      descricao: input.descricao,
      valor: input.valor,
      formaPagamento: input.formaPagamento,
      status: StatusLancamento.PENDENTE,
      vencimento: input.vencimento,
      observacoes: input.observacoes,
      categoria: input.categoria,
      servicoId: input.servicoId,
      produtoId: input.produtoId,
      quantidade: input.quantidade,
      instituicaoId: input.instituicaoId,
      recorrenciaId: input.recorrenciaId,
      competencia: input.competencia,
      criadoPor: input.criadoPor,
    });

    return this.toEntity(doc);
  }

  async findById(clinicaId: string, id: string): Promise<Lancamento | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async list(input: ListLancamentosInput): Promise<Lancamento[]> {
    const query: Record<string, unknown> = { clinicaId: input.clinicaId };

    if (input.pacienteId) query.pacienteId = input.pacienteId;
    if (input.agendamentoId) query.agendamentoId = input.agendamentoId;
    if (input.tipo) query.tipo = input.tipo;
    if (input.status) query.status = input.status;
    if (input.categoria) query.categoria = input.categoria;
    if (input.instituicaoId) query.instituicaoId = input.instituicaoId;
    if (input.dataInicio || input.dataFim) {
      query.criadoEm = {};
      if (input.dataInicio) (query.criadoEm as Record<string, unknown>).$gte = input.dataInicio;
      if (input.dataFim) (query.criadoEm as Record<string, unknown>).$lte = input.dataFim;
    }

    const docs = await this.model.find(query).sort({ criadoEm: -1 }).limit(500).exec();
    return docs.map((d) => this.toEntity(d));
  }

  async updateStatus(
    clinicaId: string,
    id: string,
    status: StatusLancamento,
    recebidoEm?: Date,
  ): Promise<Lancamento | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const set: Record<string, unknown> = { status };
    if (recebidoEm) set.recebidoEm = recebidoEm;

    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(id), status: StatusLancamento.PENDENTE },
        { $set: set },
        { new: true },
      )
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  async competenciasExistentes(clinicaId: string, recorrenciaId: string): Promise<string[]> {
    const docs = await this.model
      .find({ clinicaId, recorrenciaId }, { competencia: 1 })
      .lean();
    return docs.map((d) => d.competencia).filter((c): c is string => Boolean(c));
  }

  async dashboard(input: DashboardInput): Promise<DashboardFinanceiro> {
    const [efetivado, pendente, serieMensal] = await Promise.all([
      this.agregarEfetivado(input.clinicaId, input.dataInicio, input.dataFim),
      this.totalPendente(input.clinicaId, input.dataInicio, input.dataFim),
      this.serieMensal(input.clinicaId, this.inicioJanela12Meses(), new Date()),
    ]);

    return {
      totalReceitas: efetivado.totalReceitas,
      totalDespesas: efetivado.totalDespesas,
      totalPendente: pendente,
      saldo: efetivado.totalReceitas - efetivado.totalDespesas,
      porFormaPagamento: efetivado.porFormaPagamento,
      porCategoria: efetivado.porCategoria,
      serieMensal,
    };
  }

  async relatorio(input: RelatorioInput): Promise<RelatorioFinanceiro> {
    const extra: Record<string, unknown> = {};
    if (input.categoria) extra.categoria = input.categoria;
    if (input.instituicaoId) extra.instituicaoId = input.instituicaoId;

    const [efetivado, pendente, serieMensal, porInstituicao, produtosVendidos] = await Promise.all([
      this.agregarEfetivado(input.clinicaId, input.dataInicio, input.dataFim, extra),
      this.totalPendente(input.clinicaId, input.dataInicio, input.dataFim, extra),
      this.serieMensal(input.clinicaId, input.dataInicio, input.dataFim, extra),
      this.agruparPorChave(input.clinicaId, input.dataInicio, input.dataFim, 'instituicaoId', extra),
      this.produtosVendidos(input.clinicaId, input.dataInicio, input.dataFim, extra),
    ]);

    const linha = (c: { categoria: string; total: number; quantidade: number }): LinhaFonteReceita => ({
      categoria: c.categoria,
      total: c.total,
      quantidade: c.quantidade,
      ticketMedio: c.quantidade > 0 ? c.total / c.quantidade : 0,
    });

    return {
      periodo: { inicio: input.dataInicio, fim: input.dataFim },
      totalReceitas: efetivado.totalReceitas,
      totalDespesas: efetivado.totalDespesas,
      saldo: efetivado.totalReceitas - efetivado.totalDespesas,
      totalPendente: pendente,
      fontesReceita: efetivado.porCategoria
        .filter((c) => c.tipo === TipoLancamento.RECEITA)
        .map(linha)
        .sort((a, b) => b.total - a.total),
      despesasPorCategoria: efetivado.porCategoria
        .filter((c) => c.tipo === TipoLancamento.DESPESA)
        .map(linha)
        .sort((a, b) => b.total - a.total),
      porInstituicao: porInstituicao.map((i) => ({
        instituicaoId: i.chave,
        nome: i.chave, // resolvido para o nome real na camada de aplicacao
        total: i.total,
        quantidade: i.quantidade,
      })),
      produtosVendidos,
      serieMensal,
    };
  }

  /** Totais, composicao por categoria e por forma — sempre em regime de caixa. */
  private async agregarEfetivado(
    clinicaId: string,
    dataInicio: Date,
    dataFim: Date,
    extra: Record<string, unknown> = {},
  ) {
    const results = (await this.model
      .aggregate([
        { $match: { clinicaId, status: StatusLancamento.RECEBIDO, ...extra } },
        { $addFields: { dataCaixa: DATA_CAIXA } },
        { $match: { dataCaixa: { $gte: dataInicio, $lte: dataFim } } },
        {
          $group: {
            _id: { tipo: '$tipo', formaPagamento: '$formaPagamento', categoria: '$categoria' },
            total: { $sum: '$valor' },
            quantidade: { $sum: 1 },
          },
        },
      ])
      .exec()) as Array<{
      _id: { tipo: TipoLancamento; formaPagamento?: string; categoria?: string };
      total: number;
      quantidade: number;
    }>;

    let totalReceitas = 0;
    let totalDespesas = 0;
    const formaMap = new Map<string, { total: number; quantidade: number }>();
    const categoriaMap = new Map<
      string,
      { categoria: string; tipo: TipoLancamento; total: number; quantidade: number }
    >();

    for (const r of results) {
      if (r._id.tipo === TipoLancamento.RECEITA) totalReceitas += r.total;
      else totalDespesas += r.total;

      const forma = r._id.formaPagamento ?? 'nao_informado';
      const atualForma = formaMap.get(forma) ?? { total: 0, quantidade: 0 };
      formaMap.set(forma, {
        total: atualForma.total + r.total,
        quantidade: atualForma.quantidade + r.quantidade,
      });

      const categoria = r._id.categoria ?? 'outro';
      const chave = `${categoria}:${r._id.tipo}`;
      const atual = categoriaMap.get(chave) ?? { categoria, tipo: r._id.tipo, total: 0, quantidade: 0 };
      categoriaMap.set(chave, {
        ...atual,
        total: atual.total + r.total,
        quantidade: atual.quantidade + r.quantidade,
      });
    }

    return {
      totalReceitas,
      totalDespesas,
      porFormaPagamento: Array.from(formaMap.entries()).map(([forma, data]) => ({ forma, ...data })),
      porCategoria: Array.from(categoriaMap.values()).sort((a, b) => b.total - a.total),
    };
  }

  /**
   * Pendente nao tem data de caixa (o dinheiro nao entrou), entao e filtrado
   * pelo vencimento quando existe e pela criacao quando nao existe.
   */
  private async totalPendente(
    clinicaId: string,
    dataInicio: Date,
    dataFim: Date,
    extra: Record<string, unknown> = {},
  ): Promise<number> {
    const results = (await this.model
      .aggregate([
        { $match: { clinicaId, status: StatusLancamento.PENDENTE, ...extra } },
        { $addFields: { dataReferencia: { $ifNull: ['$vencimento', '$criadoEm'] } } },
        { $match: { dataReferencia: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: null, total: { $sum: '$valor' } } },
      ])
      .exec()) as Array<{ total: number }>;

    return results[0]?.total ?? 0;
  }

  private inicioJanela12Meses(): Date {
    const inicio = new Date();
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
    inicio.setMonth(inicio.getMonth() - 11);
    return inicio;
  }

  /** Entrada x saida efetivada mes a mes, com todos os meses do intervalo. */
  private async serieMensal(
    clinicaId: string,
    inicio: Date,
    fim: Date,
    extra: Record<string, unknown> = {},
  ): Promise<DashboardFinanceiro['serieMensal']> {
    const results = (await this.model
      .aggregate([
        { $match: { clinicaId, status: StatusLancamento.RECEBIDO, ...extra } },
        { $addFields: { dataCaixa: DATA_CAIXA } },
        { $match: { dataCaixa: { $gte: inicio, $lte: fim } } },
        {
          $group: {
            _id: { mes: { $dateToString: { format: '%Y-%m', date: '$dataCaixa' } }, tipo: '$tipo' },
            total: { $sum: '$valor' },
          },
        },
      ])
      .exec()) as Array<{ _id: { mes: string; tipo: TipoLancamento }; total: number }>;

    // Todos os meses do intervalo aparecem, mesmo zerados — eixo continuo.
    const porMes = new Map<string, { receitas: number; despesas: number }>();
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const ultimo = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursor <= ultimo) {
      porMes.set(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
        { receitas: 0, despesas: 0 },
      );
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const r of results) {
      const mes = porMes.get(r._id.mes) ?? { receitas: 0, despesas: 0 };
      if (r._id.tipo === TipoLancamento.RECEITA) mes.receitas += r.total;
      else mes.despesas += r.total;
      porMes.set(r._id.mes, mes);
    }

    return Array.from(porMes.entries()).map(([mes, valores]) => ({ mes, ...valores }));
  }

  private async agruparPorChave(
    clinicaId: string,
    dataInicio: Date,
    dataFim: Date,
    campo: string,
    extra: Record<string, unknown> = {},
  ): Promise<Array<{ chave: string; total: number; quantidade: number }>> {
    const results = (await this.model
      .aggregate([
        { $match: { clinicaId, status: StatusLancamento.RECEBIDO, [campo]: { $ne: null }, ...extra } },
        { $addFields: { dataCaixa: DATA_CAIXA } },
        { $match: { dataCaixa: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: `$${campo}`, total: { $sum: '$valor' }, quantidade: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ])
      .exec()) as Array<{ _id: string; total: number; quantidade: number }>;

    return results.filter((r) => Boolean(r._id)).map((r) => ({ chave: r._id, total: r.total, quantidade: r.quantidade }));
  }

  private async produtosVendidos(
    clinicaId: string,
    dataInicio: Date,
    dataFim: Date,
    extra: Record<string, unknown> = {},
  ): Promise<RelatorioFinanceiro['produtosVendidos']> {
    const results = (await this.model
      .aggregate([
        {
          $match: {
            clinicaId,
            status: StatusLancamento.RECEBIDO,
            tipo: TipoLancamento.RECEITA,
            produtoId: { $ne: null },
            ...extra,
          },
        },
        { $addFields: { dataCaixa: DATA_CAIXA } },
        { $match: { dataCaixa: { $gte: dataInicio, $lte: dataFim } } },
        {
          $group: {
            _id: '$produtoId',
            quantidade: { $sum: { $ifNull: ['$quantidade', 1] } },
            total: { $sum: '$valor' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 20 },
      ])
      .exec()) as Array<{ _id: string; quantidade: number; total: number }>;

    return results
      .filter((r) => Boolean(r._id))
      // nome resolvido na camada de aplicacao, que conhece o catalogo
      .map((r) => ({ produtoId: r._id, nome: r._id, quantidade: r.quantidade, total: r.total }));
  }

  private toEntity(doc: LancamentoDocument): Lancamento {
    const obj = doc.toObject({ getters: false });
    return {
      id: obj._id.toString(),
      clinicaId: obj.clinicaId,
      pacienteId: obj.pacienteId,
      agendamentoId: obj.agendamentoId,
      tipo: obj.tipo,
      descricao: obj.descricao,
      valor: obj.valor,
      formaPagamento: obj.formaPagamento,
      status: obj.status,
      vencimento: obj.vencimento,
      recebidoEm: obj.recebidoEm,
      observacoes: obj.observacoes,
      categoria: obj.categoria,
      servicoId: obj.servicoId,
      produtoId: obj.produtoId,
      quantidade: obj.quantidade,
      instituicaoId: obj.instituicaoId,
      recorrenciaId: obj.recorrenciaId,
      competencia: obj.competencia,
      criadoPor: obj.criadoPor,
      criadoEm: obj.criadoEm,
      atualizadoEm: obj.atualizadoEm,
    };
  }
}
