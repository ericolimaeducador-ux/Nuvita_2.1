import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { ClinicasService } from '../../clinicas/application/clinicas.service';
import { LIMITES_POR_PLANO } from '../../clinicas/domain/clinica.entity';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { ListPacientesQueryDto } from './dto/list-pacientes-query.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { UpdateObservacoesPacienteDto } from './dto/update-observacoes-paciente.dto';
import { PACIENTE_REPOSITORY } from '../pacientes.constants';
import { Paciente, ProjetoPaciente } from '../domain/paciente.entity';
import { PacienteRepository } from './ports/paciente.repository';

export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class PacientesService {
  constructor(
    @Inject(PACIENTE_REPOSITORY) private readonly pacientes: PacienteRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly clinicasService: ClinicasService,
  ) {}

  async create(dto: CreatePacienteDto, context: RequestAuditContext): Promise<Paciente> {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);
    await this.assertDentroDoLimiteDoPlano(clinicaId);
    const paciente = await this.pacientes.create({
      clinicaId,
      nome: dto.nome,
      cpf: dto.cpf,
      dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      sexo: dto.sexo,
      telefone: dto.telefone,
      email: dto.email,
      endereco: dto.endereco,
      convenio: dto.convenio,
      consentimentoLGPD: dto.consentimentoLGPD
        ? {
            aceito: dto.consentimentoLGPD.aceito,
            dataAceite: new Date(dto.consentimentoLGPD.dataAceite),
            versao: dto.consentimentoLGPD.versao,
          }
        : undefined,
      programaIU: dto.programaIU ?? false,
      projeto: dto.projeto,
    });

    await this.audit(AuditEvent.PATIENT_CREATED, context, {
      clinicaId,
      pacienteId: paciente.id,
    });

    return paciente;
  }

  async list(query: ListPacientesQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    const { projeto, projetoExcluir, semResultados } = this.resolveVisibilidadeProjeto(
      context.user.papel,
      query.projeto,
    );

    // Papel restrito pediu um projeto que não pode ver (PSI): lista vazia sem consultar o banco.
    if (semResultados) {
      await this.audit(query.nome ? AuditEvent.PATIENT_SEARCHED : AuditEvent.PATIENT_LISTED, context, {
        clinicaId,
        criterio: query.nome ? 'nome' : 'lista',
        quantidade: 0,
      });
      return { items: [], hasMore: false };
    }

    if (query.cpf) {
      const paciente = await this.pacientes.findByCpf(clinicaId, query.cpf, query.incluirInativos);
      const visivel = paciente && this.podeVerPaciente(context.user.papel, paciente.projeto);
      await this.audit(AuditEvent.PATIENT_SEARCHED, context, {
        clinicaId,
        criterio: 'cpf',
        pacienteId: visivel ? paciente!.id : undefined,
      });

      return {
        items: visivel ? [paciente!] : [],
        hasMore: false,
      };
    }

    const result = query.nome
      ? await this.pacientes.searchByName({
          clinicaId,
          nome: query.nome,
          cursor: query.cursor,
          limit: query.limit,
          incluirInativos: query.incluirInativos,
          programaIU: query.programaIU,
          projeto,
          projetoExcluir,
          dataNascimento: query.dataNascimento,
          sort: query.sort,
        })
      : await this.pacientes.list({
          clinicaId,
          cursor: query.cursor,
          limit: query.limit,
          incluirInativos: query.incluirInativos,
          programaIU: query.programaIU,
          projeto,
          projetoExcluir,
          dataNascimento: query.dataNascimento,
          sort: query.sort,
        });

    await this.audit(query.nome ? AuditEvent.PATIENT_SEARCHED : AuditEvent.PATIENT_LISTED, context, {
      clinicaId,
      criterio: query.nome ? 'nome' : 'lista',
      quantidade: result.items.length,
    });

    return result;
  }

  async findOne(pacienteId: string, clinicaId: string | undefined, context: RequestAuditContext): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.findById(resolvedClinicaId, pacienteId);

    if (!paciente || !this.podeVerPaciente(context.user.papel, paciente.projeto)) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_VIEWED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
    });

    return paciente;
  }

  /**
   * Resumo (nome + CPF) de vários pacientes por id, em lote e sem auditar cada
   * acesso individualmente — usado para identificar pacientes com segurança em
   * telas como a Agenda (nome completo + CPF eliminam erro de paciente errado).
   */
  async resumoPorIds(
    clinicaId: string,
    pacienteIds: string[],
  ): Promise<Map<string, { nome: string; cpf?: string }>> {
    const unicos = [...new Set(pacienteIds.filter(Boolean))];
    if (unicos.length === 0) return new Map();
    const pacientes = await this.pacientes.findManyByIds(clinicaId, unicos);
    return new Map(pacientes.map((p) => [p.id, { nome: p.nome, cpf: p.cpf }]));
  }

  async update(
    pacienteId: string,
    dto: UpdatePacienteDto,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    await this.assertPacienteVisivel(resolvedClinicaId, pacienteId, context.user.papel);
    const paciente = await this.pacientes.update(resolvedClinicaId, pacienteId, {
      ...dto,
      dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      consentimentoLGPD: dto.consentimentoLGPD
        ? {
            aceito: dto.consentimentoLGPD.aceito,
            dataAceite: new Date(dto.consentimentoLGPD.dataAceite),
            versao: dto.consentimentoLGPD.versao,
          }
        : undefined,
    });

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_UPDATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
      campos: Object.keys(dto),
    });

    return paciente;
  }

  async updateObservacoes(
    pacienteId: string,
    dto: UpdateObservacoesPacienteDto,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    await this.assertPacienteVisivel(resolvedClinicaId, pacienteId, context.user.papel);
    const paciente = await this.pacientes.update(resolvedClinicaId, pacienteId, { observacoes: dto.observacoes });

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_UPDATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
      campos: ['observacoes'],
    });

    return paciente;
  }

  async deactivate(pacienteId: string, clinicaId: string | undefined, context: RequestAuditContext): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    await this.assertPacienteVisivel(resolvedClinicaId, pacienteId, context.user.papel);
    const paciente = await this.pacientes.deactivate(resolvedClinicaId, pacienteId);

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_DEACTIVATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
    });

    return paciente;
  }

  async exportLgpd(pacienteId: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.findById(resolvedClinicaId, pacienteId);

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_EXPORTED, context, {
      clinicaId: paciente.clinicaId,
      pacienteId,
      formato: 'json',
    });

    return {
      exportadoEm: new Date().toISOString(),
      formato: 'application/json',
      dados: paciente,
    };
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  /** Bloqueia o cadastro de novo paciente quando a clínica já atingiu o limite do próprio plano (LIMITES_POR_PLANO). */
  private async assertDentroDoLimiteDoPlano(clinicaId: string): Promise<void> {
    const clinica = await this.clinicasService.findById(clinicaId);
    if (!clinica) return; // clínica não encontrada é tratado adiante pela criação em si
    const limite = LIMITES_POR_PLANO[clinica.plano].maxPacientes;
    const atual = await this.pacientes.count(clinicaId);
    if (atual >= limite) {
      throw new BadRequestException(
        `Limite de ${limite} pacientes do plano atingido. Faça upgrade do plano para cadastrar mais pacientes.`,
      );
    }
  }

  /**
   * Existia pra isolar pacientes do Projeto PSI (atendimento psicológico) —
   * só o papel PSICOLOGO os enxergava. Removido o papel, a visibilidade por
   * projeto (Alpha/Beta) passa a ser sempre um filtro livre, igual já era
   * pra admin/secretaria.
   */
  private resolveVisibilidadeProjeto(
    _papel: Papel,
    projetoSolicitado?: ProjetoPaciente,
  ): { projeto?: ProjetoPaciente; projetoExcluir?: ProjetoPaciente; semResultados?: boolean } {
    return { projeto: projetoSolicitado };
  }

  private podeVerPaciente(_papel: Papel, _projetoPaciente?: ProjetoPaciente): boolean {
    return true;
  }

  /** Barra update/desativação de paciente fora da visibilidade do papel, mesmo sabendo o ID direto. */
  private async assertPacienteVisivel(clinicaId: string, pacienteId: string, papel: Papel): Promise<void> {
    const paciente = await this.pacientes.findById(clinicaId, pacienteId);
    if (!paciente || !this.podeVerPaciente(papel, paciente.projeto)) {
      throw new NotFoundException('Paciente nao encontrado.');
    }
  }

  private async audit(
    event: AuditEvent,
    context: RequestAuditContext,
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
