import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { PermissoesGuard } from '../../auth/presentation/guards/permissoes.guard';
import { RequerModulo } from '../../auth/presentation/decorators/requer-modulo.decorator';
import { Modulo } from '../../../../../../packages/shared/src/auth';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { FinanceiroService } from '../application/financeiro.service';
import { RequestAuditContext } from '../application/request-context';
import { CadastrosFinanceirosService } from '../application/cadastros.service';
import { RecorrenciasService } from '../application/recorrencias.service';
import { CreateLancamentoDto } from '../application/dto/create-lancamento.dto';
import { FinancialDashboardQueryDto } from '../application/dto/financial-dashboard-query.dto';
import { ListLancamentosQueryDto } from '../application/dto/list-lancamentos-query.dto';
import { ReceiveLancamentoDto } from '../application/dto/receive-lancamento.dto';
import {
  CreateInstituicaoDto,
  CreateRecorrenciaDto,
  CreateServicoDto,
  ListCadastroQueryDto,
  RelatorioQueryDto,
  UpdateInstituicaoDto,
  UpdateRecorrenciaDto,
  UpdateServicoDto,
} from '../application/dto/cadastros.dto';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, PermissoesGuard)
@RequerModulo(Modulo.FINANCEIRO)
export class FinanceiroController {
  constructor(
    private readonly financeiroService: FinanceiroService,
    private readonly cadastros: CadastrosFinanceirosService,
    private readonly recorrencias: RecorrenciasService,
  ) {}

  @Post('lancamentos')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  create(@Body() dto: CreateLancamentoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.financeiroService.create(dto, this.ctx(req, user));
  }

  @Get('lancamentos')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  list(@Query() query: ListLancamentosQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.financeiroService.list(query, this.ctx(req, user));
  }

  @Get('dashboard')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  dashboard(@Query() query: FinancialDashboardQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.financeiroService.dashboard(query, this.ctx(req, user));
  }

  @Get('lancamentos/:id')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  findOne(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.financeiroService.findOne(id, clinicaId, this.ctx(req, user));
  }

  @Patch('lancamentos/:id/receber')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  receive(
    @Param('id') id: string,
    @Body() dto: ReceiveLancamentoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.financeiroService.receive(id, dto, clinicaId, this.ctx(req, user));
  }

  @Patch('lancamentos/:id/cancelar')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  cancel(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.financeiroService.cancel(id, clinicaId, this.ctx(req, user));
  }

  // ---------- Relatorios ----------

  @Get('relatorio')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  relatorio(@Query() query: RelatorioQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.financeiroService.relatorio(query, this.ctx(req, user));
  }

  @Get('relatorio/csv')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="financeiro.csv"')
  exportarCsv(@Query() query: RelatorioQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.financeiroService.exportarCsv(query, this.ctx(req, user));
  }

  // ---------- Tabela de precos ----------

  @Get('servicos')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  listarServicos(@Query() query: ListCadastroQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.cadastros.listarServicos(this.ctx(req, user), query.clinicaId, query.incluirInativos === 'true');
  }

  @Post('servicos')
  @Roles(Papel.ADMIN)
  criarServico(@Body() dto: CreateServicoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.cadastros.criarServico(dto, this.ctx(req, user));
  }

  @Patch('servicos/:id')
  @Roles(Papel.ADMIN)
  atualizarServico(
    @Param('id') id: string,
    @Body() dto: UpdateServicoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.cadastros.atualizarServico(id, dto, this.ctx(req, user));
  }

  // ---------- Clientes institucionais ----------

  @Get('instituicoes')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  listarInstituicoes(@Query() query: ListCadastroQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.cadastros.listarInstituicoes(this.ctx(req, user), query.clinicaId, query.incluirInativos === 'true');
  }

  @Post('instituicoes')
  @Roles(Papel.ADMIN)
  criarInstituicao(@Body() dto: CreateInstituicaoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.cadastros.criarInstituicao(dto, this.ctx(req, user));
  }

  @Patch('instituicoes/:id')
  @Roles(Papel.ADMIN)
  atualizarInstituicao(
    @Param('id') id: string,
    @Body() dto: UpdateInstituicaoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.cadastros.atualizarInstituicao(id, dto, this.ctx(req, user));
  }

  // ---------- Recorrencias (contratos, aluguel, contas fixas) ----------

  @Get('recorrencias')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  listarRecorrencias(@Query() query: ListCadastroQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.recorrencias.listar(this.ctx(req, user), query.clinicaId);
  }

  @Post('recorrencias')
  @Roles(Papel.ADMIN)
  criarRecorrencia(@Body() dto: CreateRecorrenciaDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.recorrencias.criar(dto, this.ctx(req, user));
  }

  @Patch('recorrencias/:id')
  @Roles(Papel.ADMIN)
  atualizarRecorrencia(
    @Param('id') id: string,
    @Body() dto: UpdateRecorrenciaDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.recorrencias.atualizar(id, dto, this.ctx(req, user));
  }

  private ctx(req: Request, user: AuthTokenPayload): RequestAuditContext {
    return { ...extractRequestMeta(req), user };
  }
}
