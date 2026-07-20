import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { Instituicao } from '../domain/instituicao.entity';
import { Servico } from '../domain/servico.entity';
import { INSTITUICAO_REPOSITORY, SERVICO_REPOSITORY } from '../financeiro.constants';
import {
  CreateInstituicaoDto,
  CreateServicoDto,
  UpdateInstituicaoDto,
  UpdateServicoDto,
} from './dto/cadastros.dto';
import { InstituicaoRepository, ServicoRepository } from './ports/cadastros.repository';
import { RequestAuditContext } from './request-context';

/** Cadastros de apoio do financeiro: tabela de precos e clientes institucionais. */
@Injectable()
export class CadastrosFinanceirosService {
  constructor(
    @Inject(SERVICO_REPOSITORY) private readonly servicos: ServicoRepository,
    @Inject(INSTITUICAO_REPOSITORY) private readonly instituicoes: InstituicaoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  // ---------- Tabela de precos ----------

  async listarServicos(context: RequestAuditContext, clinicaId?: string, incluirInativos = false): Promise<Servico[]> {
    return this.servicos.findAll(this.clinica(context, clinicaId), !incluirInativos);
  }

  async criarServico(dto: CreateServicoDto, context: RequestAuditContext): Promise<Servico> {
    const clinica = this.clinica(context, dto.clinicaId);
    const servico = await this.servicos.create({
      clinicaId: clinica,
      nome: dto.nome.trim(),
      tipo: dto.tipo,
      preco: dto.preco,
      descricao: dto.descricao,
      ativo: true,
    });

    await this.audit(AuditEvent.FINANCIAL_SERVICE_SAVED, context, { clinicaId: clinica, servicoId: servico.id });
    return servico;
  }

  async atualizarServico(id: string, dto: UpdateServicoDto, context: RequestAuditContext): Promise<Servico> {
    const clinica = this.clinica(context, dto.clinicaId);
    const { clinicaId: _ignorado, ...campos } = dto;
    const servico = await this.servicos.update(clinica, id, {
      ...campos,
      ...(campos.nome ? { nome: campos.nome.trim() } : {}),
    });

    if (!servico) throw new NotFoundException('Servico nao encontrado.');

    await this.audit(AuditEvent.FINANCIAL_SERVICE_SAVED, context, { clinicaId: clinica, servicoId: id });
    return servico;
  }

  /** Usado ao criar lancamento a partir de um servico da tabela. */
  async buscarServico(clinicaId: string, id: string): Promise<Servico> {
    const servico = await this.servicos.findById(clinicaId, id);
    if (!servico) throw new NotFoundException('Servico nao encontrado na tabela de precos.');
    return servico;
  }

  // ---------- Clientes institucionais ----------

  async listarInstituicoes(
    context: RequestAuditContext,
    clinicaId?: string,
    incluirInativos = false,
  ): Promise<Instituicao[]> {
    return this.instituicoes.findAll(this.clinica(context, clinicaId), !incluirInativos);
  }

  async criarInstituicao(dto: CreateInstituicaoDto, context: RequestAuditContext): Promise<Instituicao> {
    const clinica = this.clinica(context, dto.clinicaId);
    const instituicao = await this.instituicoes.create({
      clinicaId: clinica,
      nome: dto.nome.trim(),
      tipo: dto.tipo,
      cnpj: this.normalizarCnpj(dto.cnpj),
      contatoNome: dto.contatoNome,
      contatoEmail: dto.contatoEmail,
      contatoTelefone: dto.contatoTelefone,
      observacoes: dto.observacoes,
      ativo: true,
    });

    await this.audit(AuditEvent.FINANCIAL_INSTITUTION_SAVED, context, {
      clinicaId: clinica,
      instituicaoId: instituicao.id,
    });
    return instituicao;
  }

  async atualizarInstituicao(
    id: string,
    dto: UpdateInstituicaoDto,
    context: RequestAuditContext,
  ): Promise<Instituicao> {
    const clinica = this.clinica(context, dto.clinicaId);
    const { clinicaId: _ignorado, ...campos } = dto;
    const instituicao = await this.instituicoes.update(clinica, id, {
      ...campos,
      ...(campos.nome ? { nome: campos.nome.trim() } : {}),
      ...(campos.cnpj !== undefined ? { cnpj: this.normalizarCnpj(campos.cnpj) } : {}),
    });

    if (!instituicao) throw new NotFoundException('Instituicao nao encontrada.');

    await this.audit(AuditEvent.FINANCIAL_INSTITUTION_SAVED, context, { clinicaId: clinica, instituicaoId: id });
    return instituicao;
  }

  async garantirInstituicao(clinicaId: string, id: string): Promise<Instituicao> {
    const instituicao = await this.instituicoes.findById(clinicaId, id);
    if (!instituicao) throw new BadRequestException('Instituicao nao encontrada.');
    return instituicao;
  }

  /** Mapa id -> nome, para o relatorio exibir o cliente e nao o ObjectId. */
  async nomesDasInstituicoes(clinicaId: string): Promise<Map<string, string>> {
    const todas = await this.instituicoes.findAll(clinicaId, false);
    return new Map(todas.map((i) => [i.id, i.nome]));
  }

  private normalizarCnpj(cnpj?: string): string | undefined {
    if (!cnpj) return undefined;
    const digitos = cnpj.replace(/\D/g, '');
    return digitos.length ? digitos : undefined;
  }

  private clinica(context: RequestAuditContext, clinicaId?: string): string {
    return resolveTenantClinicaId(context.user, clinicaId);
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
