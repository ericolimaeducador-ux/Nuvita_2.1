import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { AppConfigService } from '../../../common/security/config.service';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { TERMO_CONSENTIMENTO_REPOSITORY } from '../termos-consentimento.constants';
import { TEXTO_TERMO, TermoConsentimento, VERSAO_TEXTO_TERMO } from '../domain/termo-consentimento.entity';
import { TermoConsentimentoRepository } from './ports/termo-consentimento.repository';
import { CreateTermoConsentimentoDto } from './dto/create-termo-consentimento.dto';
import { AssinarTermoConsentimentoDto } from './dto/assinar-termo-consentimento.dto';

export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class TermosConsentimentoService {
  constructor(
    @Inject(TERMO_CONSENTIMENTO_REPOSITORY) private readonly repo: TermoConsentimentoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly configService: AppConfigService,
  ) {}

  async create(dto: CreateTermoConsentimentoDto, context: RequestAuditContext): Promise<TermoConsentimento & { texto: string }> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    const termo = await this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      tipo: dto.tipo,
      versaoTexto: VERSAO_TEXTO_TERMO[dto.tipo],
      criadoPor: context.user.sub,
    });
    return this.comTexto(termo);
  }

  async findById(
    id: string,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<TermoConsentimento & { texto: string }> {
    const termo = await this.repo.findById(resolveTenantClinicaId(context.user, clinicaId), id);
    if (!termo) throw new NotFoundException('Termo de consentimento nao encontrado.');
    return this.comTexto(termo);
  }

  async listByPaciente(
    pacienteId: string,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<Array<TermoConsentimento & { texto: string }>> {
    const termos = await this.repo.listByPaciente(resolveTenantClinicaId(context.user, clinicaId), pacienteId);
    return termos.map((t) => this.comTexto(t));
  }

  /** Anexa o texto legal vigente do tipo — a versão persistida é metadado de
   * auditoria (mesmo racional do ESCALAS_VERSION), o texto servido é sempre
   * o atual (só existe uma versão por tipo até hoje). */
  private comTexto(termo: TermoConsentimento): TermoConsentimento & { texto: string } {
    return { ...termo, texto: TEXTO_TERMO[termo.tipo] };
  }

  async assinar(
    id: string,
    dto: AssinarTermoConsentimentoDto,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<TermoConsentimento & { texto: string }> {
    const resolvedClinicaId = resolveTenantClinicaId(context.user, clinicaId);
    const termo = await this.repo.findById(resolvedClinicaId, id);
    if (!termo) throw new NotFoundException('Termo de consentimento nao encontrado.');
    if (termo.assinatura) throw new ConflictException('Termo ja assinado.');

    const dataAssinatura = new Date();
    const signed = await this.repo.sign(resolvedClinicaId, id, {
      nomeAssinante: dto.nomeAssinante.trim(),
      dataAssinatura,
      assinadoPor: context.user.sub,
      hash: this.signatureHash(termo, dto.nomeAssinante.trim(), dataAssinatura),
    });

    if (!signed) throw new ConflictException('Termo nao pode ser assinado.');

    await this.auditLogs.create({
      event: AuditEvent.CONSENT_FORM_SIGNED,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { clinicaId: resolvedClinicaId, termoId: id, pacienteId: termo.pacienteId, tipo: termo.tipo },
    });

    return this.comTexto(signed);
  }

  /** Mesmo mecanismo do prontuário: HMAC server-side sobre o conteúdo do
   * termo + quem assinou + quando — não é assinatura ICP-Brasil. */
  private signatureHash(termo: TermoConsentimento, nomeAssinante: string, dataAssinatura: Date): string {
    const secret =
      this.configService.getConfig().prontuarioSignatureSecret ??
      this.configService.getConfig().jwtAccessSecret;
    const payload = {
      termo: {
        clinicaId: termo.clinicaId,
        pacienteId: termo.pacienteId,
        tipo: termo.tipo,
        versaoTexto: termo.versaoTexto,
      },
      nomeAssinante,
      dataAssinatura: dataAssinatura.toISOString(),
    };

    return createHmac('sha256', secret).update(this.stableStringify(payload)).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(object[key])}`)
      .join(',')}}`;
  }
}
