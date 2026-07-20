import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { ProdutosService } from '../../produtos/application/produtos.service';
import { LANCAMENTO_REPOSITORY } from '../financeiro.constants';
import {
  CategoriaLancamento,
  RelatorioFinanceiro,
  StatusLancamento,
  categoriaCompativelCom,
} from '../domain/lancamento.entity';
import { CadastrosFinanceirosService } from './cadastros.service';
import { RelatorioQueryDto } from './dto/cadastros.dto';
import { CreateLancamentoDto } from './dto/create-lancamento.dto';
import { FinancialDashboardQueryDto } from './dto/financial-dashboard-query.dto';
import { ListLancamentosQueryDto } from './dto/list-lancamentos-query.dto';
import { ReceiveLancamentoDto } from './dto/receive-lancamento.dto';
import { LancamentoRepository } from './ports/lancamento.repository';
import { RecorrenciasService } from './recorrencias.service';
import { RequestAuditContext } from './request-context';

export { RequestAuditContext };

@Injectable()
export class FinanceiroService {
  constructor(
    @Inject(LANCAMENTO_REPOSITORY) private readonly lancamentos: LancamentoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly cadastros: CadastrosFinanceirosService,
    private readonly recorrencias: RecorrenciasService,
    private readonly produtos: ProdutosService,
  ) {}

  async create(dto: CreateLancamentoDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    if (dto.categoria && !categoriaCompativelCom(dto.categoria, dto.tipo)) {
      throw new BadRequestException(
        `A categoria "${dto.categoria}" nao e valida para um lancamento de ${dto.tipo}.`,
      );
    }

    // O valor cobrado e SEMPRE o que veio no lancamento — a tabela de precos so
    // sugere. Aqui apenas confirmamos que o servico existe e pertence a clinica,
    // para nao gravar uma referencia orfa.
    if (dto.servicoId) {
      await this.cadastros.buscarServico(clinicaId, dto.servicoId);
    }

    if (dto.instituicaoId) {
      await this.cadastros.garantirInstituicao(clinicaId, dto.instituicaoId);
    }

    if (dto.categoria === CategoriaLancamento.VENDA_PRODUTO && !dto.produtoId) {
      throw new BadRequestException('Venda de produto exige o produto do catalogo.');
    }

    // Congela o custo do produto NESTE momento. E o que permite ao relatorio
    // calcular margem real: se o custo do catalogo for reajustado amanha, a
    // margem das vendas de hoje continua sendo a que de fato aconteceu.
    // Tambem valida que o produto pertence a clinica (o buscar levanta 404).
    let custoUnitario: number | undefined;
    if (dto.produtoId) {
      const produto = await this.produtos.buscar(context.user, dto.produtoId, dto.clinicaId);
      custoUnitario = produto.custo;
    }

    const lancamento = await this.lancamentos.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      agendamentoId: dto.agendamentoId,
      tipo: dto.tipo,
      descricao: dto.descricao,
      valor: dto.valor,
      formaPagamento: dto.formaPagamento,
      vencimento: dto.vencimento ? new Date(dto.vencimento) : undefined,
      observacoes: dto.observacoes,
      categoria: dto.categoria,
      servicoId: dto.servicoId,
      produtoId: dto.produtoId,
      quantidade: dto.quantidade,
      custoUnitario,
      instituicaoId: dto.instituicaoId,
      criadoPor: context.user.sub,
    });

    await this.audit(AuditEvent.FINANCIAL_ENTRY_CREATED, context, { clinicaId, lancamentoId: lancamento.id });
    return lancamento;
  }

  async list(query: ListLancamentosQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    await this.recorrencias.materializar(clinicaId, context);

    const lancamentos = await this.lancamentos.list({
      clinicaId,
      pacienteId: query.pacienteId,
      agendamentoId: query.agendamentoId,
      tipo: query.tipo,
      status: query.status,
      dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
      dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
    });

    await this.audit(AuditEvent.FINANCIAL_ENTRY_LISTED, context, { clinicaId, quantidade: lancamentos.length });
    return lancamentos;
  }

  async findOne(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const lancamento = await this.lancamentos.findById(resolvedClinicaId, id);

    if (!lancamento) throw new NotFoundException('Lancamento nao encontrado.');
    return lancamento;
  }

  async receive(id: string, dto: ReceiveLancamentoDto, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const lancamento = await this.lancamentos.updateStatus(
      resolvedClinicaId,
      id,
      StatusLancamento.RECEBIDO,
      dto.recebidoEm ? new Date(dto.recebidoEm) : new Date(),
    );

    if (!lancamento) throw new NotFoundException('Lancamento nao encontrado.');

    await this.audit(AuditEvent.FINANCIAL_ENTRY_RECEIVED, context, { clinicaId: resolvedClinicaId, lancamentoId: id });
    return lancamento;
  }

  async cancel(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const lancamento = await this.lancamentos.updateStatus(resolvedClinicaId, id, StatusLancamento.CANCELADO);

    if (!lancamento) throw new NotFoundException('Lancamento nao encontrado.');

    await this.audit(AuditEvent.FINANCIAL_ENTRY_CANCELLED, context, { clinicaId: resolvedClinicaId, lancamentoId: id });
    return lancamento;
  }

  async dashboard(query: FinancialDashboardQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    await this.recorrencias.materializar(clinicaId, context);

    const { dataInicio, dataFim } = this.periodo(query.dataInicio, query.dataFim);
    const result = await this.lancamentos.dashboard({ clinicaId, dataInicio, dataFim });

    await this.audit(AuditEvent.FINANCIAL_DASHBOARD_VIEWED, context, { clinicaId, dataInicio, dataFim });
    return result;
  }

  async relatorio(query: RelatorioQueryDto, context: RequestAuditContext): Promise<RelatorioFinanceiro> {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    await this.recorrencias.materializar(clinicaId, context);

    const { dataInicio, dataFim } = this.periodo(query.dataInicio, query.dataFim);
    const relatorio = await this.lancamentos.relatorio({
      clinicaId,
      dataInicio,
      dataFim,
      categoria: query.categoria,
      instituicaoId: query.instituicaoId,
    });

    // O repositorio agrega por id; quem sabe traduzir id em nome sao os
    // cadastros — por isso a resolucao acontece aqui, e nao num $lookup que
    // acoplaria o financeiro ao layout de outra colecao.
    const [nomesInstituicoes, catalogo] = await Promise.all([
      this.cadastros.nomesDasInstituicoes(clinicaId),
      this.produtos.listar(context.user, undefined, clinicaId),
    ]);
    const nomesProdutos = new Map(catalogo.map((p) => [p.id, p.nome]));

    await this.audit(AuditEvent.FINANCIAL_REPORT_VIEWED, context, { clinicaId, dataInicio, dataFim });

    return {
      ...relatorio,
      porInstituicao: relatorio.porInstituicao.map((i) => ({
        ...i,
        nome: nomesInstituicoes.get(i.instituicaoId) ?? 'Instituicao removida',
      })),
      produtosVendidos: relatorio.produtosVendidos.map((p) => ({
        ...p,
        nome: nomesProdutos.get(p.produtoId) ?? 'Produto removido',
      })),
    };
  }

  /**
   * CSV dos lancamentos do periodo, para conferencia/contabilidade. Gerado a mao
   * (o projeto nao tem lib de planilha e nao vale adicionar uma por isto).
   */
  async exportarCsv(query: RelatorioQueryDto, context: RequestAuditContext): Promise<string> {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    await this.recorrencias.materializar(clinicaId, context);

    const { dataInicio, dataFim } = this.periodo(query.dataInicio, query.dataFim);
    const lancamentos = await this.lancamentos.list({
      clinicaId,
      dataInicio,
      dataFim,
      categoria: query.categoria,
      instituicaoId: query.instituicaoId,
    });

    const nomesInstituicoes = await this.cadastros.nomesDasInstituicoes(clinicaId);

    const cabecalho = [
      'Data',
      'Descricao',
      'Tipo',
      'Categoria',
      'Instituicao',
      'Competencia',
      'Valor',
      'Status',
      'Forma de pagamento',
      'Vencimento',
      'Recebido em',
    ];

    const linhas = lancamentos.map((l) => [
      this.formatarData(l.criadoEm),
      l.descricao,
      l.tipo,
      l.categoria ?? '',
      l.instituicaoId ? nomesInstituicoes.get(l.instituicaoId) ?? '' : '',
      l.competencia ?? '',
      l.valor.toFixed(2).replace('.', ','),
      l.status,
      l.formaPagamento ?? '',
      this.formatarData(l.vencimento),
      this.formatarData(l.recebidoEm),
    ]);

    await this.audit(AuditEvent.FINANCIAL_REPORT_EXPORTED, context, {
      clinicaId,
      quantidade: lancamentos.length,
    });

    // BOM para o Excel em pt-BR abrir os acentos corretamente; separador ";"
    // pela mesma razao (a virgula ja e o separador decimal).
    return '﻿' + [cabecalho, ...linhas].map((linha) => linha.map(this.celulaCsv).join(';')).join('\r\n');
  }

  /** Escapa aspas e envolve o campo — protege contra separador dentro do texto. */
  private celulaCsv(valor: string): string {
    return `"${String(valor ?? '').replace(/"/g, '""')}"`;
  }

  private formatarData(data?: Date): string {
    return data ? new Date(data).toLocaleDateString('pt-BR') : '';
  }

  /** Padrao: mes corrente (mesma janela que o dashboard sempre usou). */
  private periodo(inicio?: string, fim?: string): { dataInicio: Date; dataFim: Date } {
    const agora = new Date();
    return {
      dataInicio: inicio ? new Date(inicio) : new Date(agora.getFullYear(), agora.getMonth(), 1),
      dataFim: fim ? new Date(fim) : new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
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
