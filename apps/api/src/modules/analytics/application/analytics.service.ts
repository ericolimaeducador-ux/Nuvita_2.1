import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { Connection } from 'mongoose';
import {
  ANALYTICS_COLLECTION_AGENDAMENTOS,
  ANALYTICS_COLLECTION_NOTIFICACOES,
  ANALYTICS_COLLECTION_PACIENTES,
} from '../analytics.constants';

@Injectable()
export class AnalyticsService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async pacientes(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_PACIENTES);

    const [totalAtivos, novosPorMes, porSexo] = await Promise.all([
      col.countDocuments({ clinicaId, ativo: true }),

      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { ano: { $year: '$criadoEm' }, mes: { $month: '$criadoEm' } }, total: { $sum: 1 } } },
        { $sort: { '_id.ano': 1, '_id.mes': 1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, ativo: true } },
        { $group: { _id: '$sexo', total: { $sum: 1 } } },
      ]).toArray(),
    ]);

    return { totalAtivos, novosPorMes, porSexo };
  }

  async agendamentos(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_AGENDAMENTOS);

    const [porStatus, porTipo, porMedico, porMes] = await Promise.all([
      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$status', total: { $sum: 1 } } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$tipo', total: { $sum: 1 } } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$medicoId', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { ano: { $year: '$dataHoraInicio' }, mes: { $month: '$dataHoraInicio' } }, total: { $sum: 1 } } },
        { $sort: { '_id.ano': 1, '_id.mes': 1 } },
      ]).toArray(),
    ]);

    // `medicoId` é o nome herdado da coluna no schema (o papel MEDICO não existe
    // mais; hoje o campo guarda o ENFERMEIRO responsável). Renomear a coluna
    // mexeria em schema, DTOs e dado em produção — mas a resposta da API já sai
    // com o nome honesto, para não espalhar o termo errado para consumidores novos.
    return { porStatus, porTipo, topProfissionais: porMedico, porMes };
  }

  /**
   * `financeiro()` foi REMOVIDO daqui. O relatório do módulo financeiro
   * (`FinanceiroService.relatorio`) faz o mesmo com mais detalhe e em regime de
   * caixa; este agregava por `criadoEm`, então uma cobrança lançada em janeiro e
   * paga em março entrava como receita de janeiro. Duas telas com números
   * divergentes sobre a mesma pergunta é pior do que uma tela só.
   */

  async notificacoes(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_NOTIFICACOES);

    const [porStatus, porCanal, porTipo, taxaEntrega] = await Promise.all([
      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$status', total: { $sum: 1 } } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$canal', total: { $sum: 1 }, enviados: { $sum: { $cond: [{ $eq: ['$status', 'enviado'] }, 1, 0] } } } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$tipo', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: null, total: { $sum: 1 }, enviados: { $sum: { $cond: [{ $eq: ['$status', 'enviado'] }, 1, 0] } } } },
      ]).toArray(),
    ]);

    const taxa = taxaEntrega[0] as { total: number; enviados: number } | undefined;

    return {
      porStatus,
      porCanal,
      porTipo,
      taxaEntrega: taxa ? Math.round((taxa.enviados / taxa.total) * 100) : 0,
    };
  }

  defaultPeriod(): { dataInicio: Date; dataFim: Date } {
    const now = new Date();
    return {
      dataInicio: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      dataFim: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  resolveClinicaId(user: AuthTokenPayload, requestedId?: string): string {
    return resolveTenantClinicaId(user, requestedId);
  }
}
