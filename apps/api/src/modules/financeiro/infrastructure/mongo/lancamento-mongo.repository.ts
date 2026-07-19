import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateLancamentoInput,
  DashboardInput,
  LancamentoRepository,
  ListLancamentosInput,
} from '../../application/ports/lancamento.repository';
import {
  DashboardFinanceiro,
  Lancamento,
  OrigemLancamento,
  StatusLancamento,
  TipoLancamento,
} from '../../domain/lancamento.entity';
import { LancamentoDocument, LancamentoMongo } from './lancamento.schema';

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
      origem: input.origem ?? OrigemLancamento.GERAL,
      categoria: input.categoria,
      produtoId: input.produtoId,
      quantidade: input.quantidade,
      profissionalId: input.profissionalId,
      ciclo: input.ciclo,
      criadoPor: input.criadoPor,
    });

    return this.toEntity(doc);
  }

  async findById(clinicaId: string, id: string): Promise<Lancamento | null> {
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async list(input: ListLancamentosInput): Promise<Lancamento[]> {
    const query: Record<string, unknown> = { clinicaId: input.clinicaId };

    if (input.pacienteId) query.pacienteId = input.pacienteId;
    if (input.agendamentoId) query.agendamentoId = input.agendamentoId;
    if (input.tipo) query.tipo = input.tipo;
    if (input.status) query.status = input.status;
    if (input.profissionalId) query.profissionalId = input.profissionalId;
    // Lançamentos antigos não têm o campo: origem "geral" inclui os sem origem.
    if (input.origem === OrigemLancamento.GERAL) {
      query.origem = { $in: [OrigemLancamento.GERAL, null] };
    } else if (input.origem) {
      query.origem = input.origem;
    }
    if (input.dataInicio || input.dataFim) {
      query.criadoEm = {};
      if (input.dataInicio) (query.criadoEm as Record<string, unknown>).$gte = input.dataInicio;
      if (input.dataFim) (query.criadoEm as Record<string, unknown>).$lte = input.dataFim;
    }

    const docs = await this.model.find(query).sort({ criadoEm: -1 }).limit(500).exec();
    return docs.map((d) => this.toEntity(d));
  }

  async updateStatus(clinicaId: string, id: string, status: StatusLancamento, recebidoEm?: Date): Promise<Lancamento | null> {
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

  async dashboard(input: DashboardInput): Promise<DashboardFinanceiro> {
    const match: Record<string, unknown> = {
      clinicaId: input.clinicaId,
      status: { $ne: StatusLancamento.CANCELADO },
      criadoEm: { $gte: input.dataInicio, $lte: input.dataFim },
    };
    // Sem origem gravada = lançamento antigo, que é do caixa geral.
    if (input.origem === OrigemLancamento.GERAL) {
      match.origem = { $in: [OrigemLancamento.GERAL, null] };
    } else if (input.origem) {
      match.origem = input.origem;
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { tipo: '$tipo', formaPagamento: '$formaPagamento', status: '$status', categoria: '$categoria' },
          total: { $sum: '$valor' },
          quantidade: { $sum: 1 },
        },
      },
    ];

    const results = await this.model.aggregate(pipeline).exec() as Array<{
      _id: { tipo: TipoLancamento; formaPagamento?: string; status: StatusLancamento; categoria?: string };
      total: number;
      quantidade: number;
    }>;

    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalPendente = 0;
    const formaMap = new Map<string, { total: number; quantidade: number }>();
    const categoriaMap = new Map<string, { categoria: string; tipo: TipoLancamento; total: number; quantidade: number }>();

    for (const r of results) {
      if (r._id.tipo === TipoLancamento.RECEITA && r._id.status === StatusLancamento.RECEBIDO) {
        totalReceitas += r.total;
      } else if (r._id.tipo === TipoLancamento.DESPESA && r._id.status === StatusLancamento.RECEBIDO) {
        totalDespesas += r.total;
      }

      if (r._id.status === StatusLancamento.PENDENTE) {
        totalPendente += r.total;
      }

      const forma = r._id.formaPagamento ?? 'nao_informado';
      const current = formaMap.get(forma) ?? { total: 0, quantidade: 0 };
      formaMap.set(forma, { total: current.total + r.total, quantidade: current.quantidade + r.quantidade });

      // Composição por categoria só com o que foi efetivado (recebido/pago) —
      // pendências ficam no card próprio, não distorcem os gráficos.
      if (r._id.status === StatusLancamento.RECEBIDO) {
        const categoria = r._id.categoria ?? 'outro';
        const key = `${categoria}:${r._id.tipo}`;
        const atual = categoriaMap.get(key) ?? { categoria, tipo: r._id.tipo, total: 0, quantidade: 0 };
        categoriaMap.set(key, { ...atual, total: atual.total + r.total, quantidade: atual.quantidade + r.quantidade });
      }
    }

    return {
      totalReceitas,
      totalDespesas,
      totalPendente,
      saldo: totalReceitas - totalDespesas,
      porFormaPagamento: Array.from(formaMap.entries()).map(([forma, data]) => ({ forma, ...data })),
      porCategoria: Array.from(categoriaMap.values()).sort((a, b) => b.total - a.total),
      serieMensal: await this.serieMensal(match),
    };
  }

  /**
   * Entrada×saída efetivada por mês nos últimos 12 meses (independe do filtro
   * de período do dashboard — o gráfico de evolução precisa da janela cheia).
   */
  private async serieMensal(matchBase: Record<string, unknown>): Promise<DashboardFinanceiro['serieMensal']> {
    const inicio = new Date();
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
    inicio.setMonth(inicio.getMonth() - 11);

    const match = { ...matchBase, status: StatusLancamento.RECEBIDO, criadoEm: { $gte: inicio } };
    const results = await this.model
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: { mes: { $dateToString: { format: '%Y-%m', date: '$criadoEm' } }, tipo: '$tipo' },
            total: { $sum: '$valor' },
          },
        },
      ])
      .exec() as Array<{ _id: { mes: string; tipo: TipoLancamento }; total: number }>;

    const porMes = new Map<string, { receitas: number; despesas: number }>();
    // Todos os 12 meses aparecem, mesmo zerados — eixo do gráfico contínuo.
    for (let i = 0; i < 12; i++) {
      const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
      porMes.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, { receitas: 0, despesas: 0 });
    }
    for (const r of results) {
      const mes = porMes.get(r._id.mes) ?? { receitas: 0, despesas: 0 };
      if (r._id.tipo === TipoLancamento.RECEITA) mes.receitas += r.total;
      else mes.despesas += r.total;
      porMes.set(r._id.mes, mes);
    }

    return Array.from(porMes.entries()).map(([mes, valores]) => ({ mes, ...valores }));
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
      origem: obj.origem ?? OrigemLancamento.GERAL,
      categoria: obj.categoria,
      produtoId: obj.produtoId,
      quantidade: obj.quantidade,
      profissionalId: obj.profissionalId,
      ciclo: obj.ciclo,
      criadoPor: obj.criadoPor,
      criadoEm: obj.criadoEm,
      atualizadoEm: obj.atualizadoEm,
    };
  }
}
