import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { PermissoesGuard } from '../../auth/presentation/guards/permissoes.guard';
import { RequerModulo } from '../../auth/presentation/decorators/requer-modulo.decorator';
import { Modulo } from '../../../../../../packages/shared/src/auth';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CreateFeridaDto } from '../application/dto/create-ferida.dto';
import { UpdateFeridaDto } from '../application/dto/update-ferida.dto';
import { AvaliacaoFeridaService } from '../application/avaliacao-ferida.service';
import { FeridasRequestContext, FeridasService } from '../application/feridas.service';

// Leitura aberta também a ADMIN/SECRETARIA (precisam ver o quadro clínico do
// paciente); mutação restrita aos profissionais clinicamente responsáveis —
// não reusa PAPEIS_PROFISSIONAIS inteiro (que inclui ADVOGADO/PSICOLOGO, sem
// sentido clínico aqui).
const LEITURA_FERIDAS = [Papel.ENFERMEIRO, Papel.ADMIN, Papel.SECRETARIA];
const MUTACAO_FERIDAS = [Papel.ENFERMEIRO, Papel.ADMIN];

@Controller('feridas')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, PermissoesGuard)
@RequerModulo(Modulo.FERIDAS)
export class FeridasController {
  constructor(
    private readonly service: FeridasService,
    private readonly avaliacaoFeridaService: AvaliacaoFeridaService,
  ) {}

  @Post()
  @Roles(...MUTACAO_FERIDAS)
  create(@Body() dto: CreateFeridaDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.create(dto, this.contextFromRequest(request, user));
  }

  @Patch(':id')
  @Roles(...MUTACAO_FERIDAS)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFeridaDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.update(id, dto, clinicaId, this.contextFromRequest(request, user));
  }

  @Patch(':id/excluir')
  @Roles(...MUTACAO_FERIDAS)
  excluir(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.excluir(id, clinicaId, this.contextFromRequest(request, user));
  }

  @Get()
  @Roles(...LEITURA_FERIDAS)
  listByPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.listByPaciente(pacienteId, clinicaId, this.contextFromRequest(request, user));
  }

  @Get(':id')
  @Roles(...LEITURA_FERIDAS)
  findOne(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.findOne(id, clinicaId, this.contextFromRequest(request, user));
  }

  @Get(':id/timeline')
  @Roles(...LEITURA_FERIDAS)
  timeline(
    @Param('id') feridaId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.avaliacaoFeridaService.timeline(feridaId, clinicaId, this.contextFromRequest(request, user));
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): FeridasRequestContext {
    return { ...extractRequestMeta(request), user };
  }
}
