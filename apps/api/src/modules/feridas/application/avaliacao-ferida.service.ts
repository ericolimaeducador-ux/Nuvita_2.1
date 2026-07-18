import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { CreateAvaliacaoFeridaDto } from './dto/create-avaliacao-ferida.dto';
import { AVALIACAO_FERIDA_REPOSITORY } from '../feridas.constants';
import { AvaliacaoFerida, NivelRisco, PontoTimelineFerida, TimelineFerida } from '../domain/avaliacao-ferida.entity';
import { avaliarRiscoFerida, ENGINE_VERSION } from '../domain/risk-engine';
import { calcularPush, calcularResvech, ESCALAS_VERSION, EscalasClinicas } from '../domain/escalas';
import { AvaliacaoFeridaRepository } from './ports/avaliacao-ferida.repository';
import { FeridasService } from './feridas.service';

export interface AvaliacaoFeridaRequestContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

const RISCOS_QUE_NOTIFICAM = new Set<NivelRisco>([NivelRisco.ALTO, NivelRisco.URGENTE]);

@Injectable()
export class AvaliacaoFeridaService {
  constructor(
    @Inject(AVALIACAO_FERIDA_REPOSITORY) private readonly avaliacoes: AvaliacaoFeridaRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    @Optional() private readonly notificacoes: NotificacoesService,
    private readonly feridasService: FeridasService,
  ) {}

  async create(
    feridaId: string,
    dto: CreateAvaliacaoFeridaDto,
    clinicaId: string | undefined,
    context: AvaliacaoFeridaRequestContext,
  ): Promise<AvaliacaoFerida> {
    const resolved = this.resolveClinicaId(context.user, clinicaId);
    // findOne lança NotFoundException se a ferida não existe ou não pertence à clínica do usuário.
    const ferida = await this.feridasService.findOne(feridaId, resolved, context);

    const somaTecido =
      dto.tecido.granulacaoPct + dto.tecido.epitelizacaoPct + dto.tecido.esfaceloPct + dto.tecido.necrosePct;
    if (somaTecido > 100) {
      throw new BadRequestException('A soma dos percentuais de tecido não pode exceder 100.');
    }

    const areaCm2 = dto.medicao.areaCm2 ?? Math.round(dto.medicao.comprimentoCm * dto.medicao.larguraCm * 100) / 100;

    const escalaDor = dto.escalaDor ?? 0;
    const odor = dto.odor ?? false;
    const achadosPerilesionais = dto.achadosPerilesionais ?? [];
    const sinaisSistemicos = dto.sinaisSistemicos ?? false;
    const perfusaoRuim = dto.perfusaoRuim ?? false;
    const ossoOuTendaoExposto = dto.ossoOuTendaoExposto ?? false;

    const recomendacoes = avaliarRiscoFerida({
      etiologia: ferida.etiologia,
      medicao: { ...dto.medicao, areaCm2 },
      tecido: dto.tecido,
      exsudato: dto.exsudato,
      escalaDor,
      odor,
      achadosPerilesionais,
      sinaisSistemicos,
      perfusaoRuim,
      ossoOuTendaoExposto,
      pioraAreaPct30Dias: dto.pioraAreaPct30Dias,
      diasCicatrizacaoEstagnada: dto.diasCicatrizacaoEstagnada,
    });

    // RESVECH exige os dois campos próprios juntos — um sem o outro é quase
    // sempre esquecimento no preenchimento, melhor avisar do que pontuar errado.
    if ((dto.bordas === undefined) !== (dto.tecidosAfetados === undefined)) {
      throw new BadRequestException('Para pontuar RESVECH 2.0, informe bordas e tecidosAfetados juntos.');
    }

    const escalas: EscalasClinicas = {
      push: calcularPush({ ...dto.medicao, areaCm2 }, dto.tecido, dto.exsudato),
      resvech:
        dto.bordas !== undefined && dto.tecidosAfetados !== undefined
          ? calcularResvech({
              medicao: { ...dto.medicao, areaCm2 },
              tecido: dto.tecido,
              exsudato: dto.exsudato,
              odor,
              achadosPerilesionais,
              pioraAreaPct30Dias: dto.pioraAreaPct30Dias,
              diasCicatrizacaoEstagnada: dto.diasCicatrizacaoEstagnada,
              bordas: dto.bordas,
              tecidosAfetados: dto.tecidosAfetados,
              sinaisInfeccao: dto.sinaisInfeccao,
            })
          : undefined,
      versao: ESCALAS_VERSION,
    };

    const avaliacao = await this.avaliacoes.create({
      feridaId,
      clinicaId: resolved,
      profissionalId: context.user.sub,
      medicao: { ...dto.medicao, areaCm2 },
      tecido: dto.tecido,
      exsudato: dto.exsudato,
      escalaDor,
      odor,
      achadosPerilesionais,
      sinaisSistemicos,
      perfusaoRuim,
      ossoOuTendaoExposto,
      pioraAreaPct30Dias: dto.pioraAreaPct30Dias,
      diasCicatrizacaoEstagnada: dto.diasCicatrizacaoEstagnada,
      bordas: dto.bordas,
      tecidosAfetados: dto.tecidosAfetados,
      sinaisInfeccao: dto.sinaisInfeccao,
      recomendacoes,
      motorClinico: ENGINE_VERSION,
      escalas,
    });

    if (this.notificacoes && RISCOS_QUE_NOTIFICAM.has(recomendacoes[0].risco)) {
      void this.notificacoes.notificarRiscoFerida(resolved, ferida.pacienteId, 'Paciente');
    }

    await this.audit(AuditEvent.WOUND_ASSESSMENT_CREATED, context, {
      clinicaId: resolved,
      feridaId,
      avaliacaoId: avaliacao.id,
      maiorRisco: recomendacoes[0].risco,
    });

    return avaliacao;
  }

  async listByFerida(
    feridaId: string,
    clinicaId: string | undefined,
    context: AvaliacaoFeridaRequestContext,
  ): Promise<AvaliacaoFerida[]> {
    const resolved = this.resolveClinicaId(context.user, clinicaId);
    await this.feridasService.findOne(feridaId, resolved, context);
    return this.avaliacoes.listByFerida(resolved, feridaId);
  }

  async findOne(
    id: string,
    clinicaId: string | undefined,
    context: AvaliacaoFeridaRequestContext,
  ): Promise<AvaliacaoFerida> {
    const resolved = this.resolveClinicaId(context.user, clinicaId);
    const avaliacao = await this.avaliacoes.findById(resolved, id);
    if (!avaliacao) throw new BadRequestException('Avaliação não encontrada.');
    return avaliacao;
  }

  /** Compara a primeira e a última avaliação da ferida para indicar tendência de evolução (mesmos limiares do woundcare-ai). */
  async timeline(
    feridaId: string,
    clinicaId: string | undefined,
    context: AvaliacaoFeridaRequestContext,
  ): Promise<TimelineFerida> {
    const resolved = this.resolveClinicaId(context.user, clinicaId);
    await this.feridasService.findOne(feridaId, resolved, context);
    const avaliacoes = await this.avaliacoes.listByFerida(resolved, feridaId);

    const pontos: PontoTimelineFerida[] = avaliacoes.map((a) => ({
      avaliacaoId: a.id,
      criadoEm: a.criadoEm,
      areaCm2: a.medicao.areaCm2,
      profundidadeCm: a.medicao.profundidadeCm,
      escalaDor: a.escalaDor,
      exsudato: a.exsudato,
      necrosePct: a.tecido.necrosePct,
      esfaceloPct: a.tecido.esfaceloPct,
      granulacaoPct: a.tecido.granulacaoPct,
      epitelizacaoPct: a.tecido.epitelizacaoPct,
      maiorRisco: a.recomendacoes[0].risco,
      titulosRecomendacoes: a.recomendacoes.map((r) => r.titulo),
      pushTotal: a.escalas?.push.total,
      resvechTotal: a.escalas?.resvech?.total,
    }));

    const primeira = pontos[0]?.areaCm2;
    const ultima = pontos[pontos.length - 1]?.areaCm2;
    let status: TimelineFerida['tendencia']['status'] = 'estavel';
    if (primeira !== undefined && ultima !== undefined && primeira > 0) {
      const variacaoPct = ((ultima - primeira) / primeira) * 100;
      if (variacaoPct <= -20) status = 'melhorando';
      else if (variacaoPct >= 20) status = 'piorando';
    }

    return { pontos, tendencia: { status } };
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  private async audit(
    event: AuditEvent,
    context: AvaliacaoFeridaRequestContext,
    metadata: Record<string, unknown>,
  ): Promise<void> {
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
