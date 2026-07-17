import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { CreateFeridaDto } from './dto/create-ferida.dto';
import { UpdateFeridaDto } from './dto/update-ferida.dto';
import { FERIDA_REPOSITORY } from '../feridas.constants';
import { Ferida, StatusFerida } from '../domain/ferida.entity';
import { FeridaRepository } from './ports/ferida.repository';

export interface FeridasRequestContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class FeridasService {
  constructor(
    @Inject(FERIDA_REPOSITORY) private readonly feridas: FeridaRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
  ) {}

  async create(dto: CreateFeridaDto, context: FeridasRequestContext): Promise<Ferida> {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);
    // Garante que o paciente existe e é visível ao usuário atual (tenant + regras de projeto).
    await this.pacientesService.findOne(dto.pacienteId, clinicaId, context);

    const ferida = await this.feridas.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      rotulo: dto.rotulo,
      etiologia: dto.etiologia,
      localizacao: dto.localizacao,
      status: dto.status ?? StatusFerida.ATIVA,
      dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
      observacoes: dto.observacoes,
    });

    await this.audit(AuditEvent.WOUND_CREATED, context, {
      clinicaId,
      feridaId: ferida.id,
      pacienteId: dto.pacienteId,
    });

    return ferida;
  }

  async update(
    id: string,
    dto: UpdateFeridaDto,
    clinicaId: string | undefined,
    context: FeridasRequestContext,
  ): Promise<Ferida> {
    const resolved = this.resolveClinicaId(context.user, clinicaId);
    const ferida = await this.feridas.update(resolved, id, dto);
    if (!ferida) throw new NotFoundException('Ferida não encontrada.');

    await this.audit(AuditEvent.WOUND_UPDATED, context, { clinicaId: resolved, feridaId: id });

    return ferida;
  }

  async findOne(id: string, clinicaId: string | undefined, context: FeridasRequestContext): Promise<Ferida> {
    const resolved = this.resolveClinicaId(context.user, clinicaId);
    const ferida = await this.feridas.findById(resolved, id);
    if (!ferida) throw new NotFoundException('Ferida não encontrada.');
    return ferida;
  }

  async listByPaciente(
    pacienteId: string,
    clinicaId: string | undefined,
    context: FeridasRequestContext,
  ): Promise<Ferida[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId é obrigatório.');
    return this.feridas.listByPaciente(this.resolveClinicaId(context.user, clinicaId), pacienteId);
  }

  async excluir(id: string, clinicaId: string | undefined, context: FeridasRequestContext): Promise<Ferida> {
    const resolved = this.resolveClinicaId(context.user, clinicaId);
    const excluida = await this.feridas.softDelete(resolved, id, context.user.sub);
    if (!excluida) throw new NotFoundException('Ferida não encontrada.');
    return excluida;
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  private async audit(
    event: AuditEvent,
    context: FeridasRequestContext,
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
