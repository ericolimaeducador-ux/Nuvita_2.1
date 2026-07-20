import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CategoriaLancamento, Lancamento, categoriaCompativelCom } from '../domain/lancamento.entity';
import {
  Recorrencia,
  competenciasDevidas,
  vencimentoDaCompetencia,
} from '../domain/recorrencia.entity';
import { LANCAMENTO_REPOSITORY, RECORRENCIA_REPOSITORY } from '../financeiro.constants';
import { CadastrosFinanceirosService } from './cadastros.service';
import { CreateRecorrenciaDto, UpdateRecorrenciaDto } from './dto/cadastros.dto';
import { RequestAuditContext } from './request-context';
import { RecorrenciaRepository } from './ports/cadastros.repository';
import { LancamentoRepository } from './ports/lancamento.repository';

/**
 * Motor unico de cobranca/pagamento recorrente, usado pelos dois lados do caixa:
 * contrato de consultoria (receita) e aluguel/conta fixa (despesa).
 *
 * A materializacao e SOB DEMANDA e idempotente, nao agendada: toda vez que o
 * financeiro e consultado, as competencias faltantes viram lancamento. Assim o
 * projeto nao ganha um scheduler novo (nao ha `@nestjs/schedule` aqui) e o
 * sistema se autocorrige mesmo se a API ficar dias fora do ar — o mes que
 * passou e gerado na primeira consulta seguinte.
 */
@Injectable()
export class RecorrenciasService {
  private readonly logger = new Logger(RecorrenciasService.name);

  constructor(
    @Inject(RECORRENCIA_REPOSITORY) private readonly recorrencias: RecorrenciaRepository,
    @Inject(LANCAMENTO_REPOSITORY) private readonly lancamentos: LancamentoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly cadastros: CadastrosFinanceirosService,
  ) {}

  async listar(context: RequestAuditContext, clinicaId?: string): Promise<Recorrencia[]> {
    return this.recorrencias.findAll(resolveTenantClinicaId(context.user, clinicaId));
  }

  async criar(dto: CreateRecorrenciaDto, context: RequestAuditContext): Promise<Recorrencia> {
    const clinica = resolveTenantClinicaId(context.user, dto.clinicaId);

    if (!categoriaCompativelCom(dto.categoria, dto.tipo)) {
      throw new BadRequestException(
        `A categoria "${dto.categoria}" nao e valida para um lancamento de ${dto.tipo}.`,
      );
    }

    // Consultoria e receita ligada a um cliente; sem instituicao o relatorio
    // por cliente institucional nasceria furado.
    if (dto.categoria === CategoriaLancamento.CONSULTORIA) {
      if (!dto.instituicaoId) {
        throw new BadRequestException('Contrato de consultoria exige a instituicao contratante.');
      }
      await this.cadastros.garantirInstituicao(clinica, dto.instituicaoId);
    }

    const inicio = new Date(dto.inicio);
    const fim = dto.fim ? new Date(dto.fim) : undefined;
    if (fim && fim < inicio) {
      throw new BadRequestException('A data final da vigencia nao pode ser anterior ao inicio.');
    }

    const recorrencia = await this.recorrencias.create({
      clinicaId: clinica,
      descricao: dto.descricao.trim(),
      tipo: dto.tipo,
      categoria: dto.categoria,
      instituicaoId: dto.instituicaoId,
      valorMensal: dto.valorMensal,
      diaVencimento: dto.diaVencimento,
      inicio,
      fim,
      ativo: true,
    });

    await this.audit(AuditEvent.FINANCIAL_RECURRENCE_SAVED, context, {
      clinicaId: clinica,
      recorrenciaId: recorrencia.id,
    });

    // Cadastro com inicio retroativo materializa o historico na hora.
    await this.materializar(clinica, context);
    return recorrencia;
  }

  async atualizar(id: string, dto: UpdateRecorrenciaDto, context: RequestAuditContext): Promise<Recorrencia> {
    const clinica = resolveTenantClinicaId(context.user, dto.clinicaId);
    const { clinicaId: _ignorado, fim, ...campos } = dto;

    const recorrencia = await this.recorrencias.update(clinica, id, {
      ...campos,
      ...(fim !== undefined ? { fim: new Date(fim) } : {}),
    });

    if (!recorrencia) throw new NotFoundException('Recorrencia nao encontrada.');

    await this.audit(AuditEvent.FINANCIAL_RECURRENCE_SAVED, context, { clinicaId: clinica, recorrenciaId: id });
    return recorrencia;
  }

  /**
   * Cria os lancamentos que faltam para todas as recorrencias ativas da clinica.
   * Idempotente por construcao: consulta as competencias ja existentes e o banco
   * ainda tem indice unico (clinicaId, recorrenciaId, competencia) como rede de
   * seguranca contra chamadas concorrentes.
   *
   * Nunca lanca para o chamador: materializacao e efeito de fundo do
   * carregamento do financeiro e nao pode derrubar a tela se algo falhar.
   */
  async materializar(clinicaId: string, context: RequestAuditContext): Promise<Lancamento[]> {
    const criados: Lancamento[] = [];

    try {
      const ativas = await this.recorrencias.findAll(clinicaId, true);
      const agora = new Date();

      for (const recorrencia of ativas) {
        const devidas = competenciasDevidas(recorrencia, agora);
        if (devidas.length === 0) continue;

        const existentes = new Set(await this.lancamentos.competenciasExistentes(clinicaId, recorrencia.id));
        const faltantes = devidas.filter((c) => !existentes.has(c));

        for (const competencia of faltantes) {
          try {
            const lancamento = await this.lancamentos.create({
              clinicaId,
              tipo: recorrencia.tipo,
              descricao: `${recorrencia.descricao} — ${competencia}`,
              valor: recorrencia.valorMensal,
              vencimento: vencimentoDaCompetencia(competencia, recorrencia.diaVencimento),
              categoria: recorrencia.categoria,
              instituicaoId: recorrencia.instituicaoId,
              recorrenciaId: recorrencia.id,
              competencia,
              criadoPor: context.user.sub,
            });
            criados.push(lancamento);
          } catch (error) {
            // E11000 = outra requisicao materializou a mesma competencia entre a
            // leitura e a escrita. Esperado sob concorrencia, nao e falha.
            if (!this.ehDuplicidade(error)) throw error;
          }
        }
      }

      if (criados.length > 0) {
        await this.audit(AuditEvent.FINANCIAL_RECURRENCE_MATERIALIZED, context, {
          clinicaId,
          quantidade: criados.length,
        });
      }
    } catch (error) {
      this.logger.error(`Falha ao materializar recorrencias da clinica ${clinicaId}: ${(error as Error).message}`);
    }

    return criados;
  }

  private ehDuplicidade(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
  }

  private async audit(event: AuditEvent, context: RequestAuditContext, metadata: Record<string, unknown>) {
    await this.auditLogs.create({
      event,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata,
    });
  }
}
