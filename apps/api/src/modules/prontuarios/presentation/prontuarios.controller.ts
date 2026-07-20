import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { PermissoesGuard } from '../../auth/presentation/guards/permissoes.guard';
import { RequerModulo } from '../../auth/presentation/decorators/requer-modulo.decorator';
import { Modulo } from '../../../../../../packages/shared/src/auth';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { Cid10QueryDto } from '../application/dto/cid10-query.dto';
import { CreateAddendumDto } from '../application/dto/create-addendum.dto';
import { CreateProntuarioDto } from '../application/dto/create-prontuario.dto';
import { ListProntuariosQueryDto } from '../application/dto/list-prontuarios-query.dto';
import { UpdateProntuarioDto } from '../application/dto/update-prontuario.dto';
import { ProntuarioRequestContext, ProntuariosService } from '../application/prontuarios.service';

/**
 * LEITURA inclui o ADMIN: ele tem `Modulo.PRONTUARIOS` por padrão e a rota
 * aparece no menu dele, mas o `@Roles` de classe (só papel profissional) fazia
 * TODA chamada responder 403 — a tela abria e nada carregava. Supervisão
 * administrativa poder ler é coerente com o resto do produto (o ADMIN já lê
 * feridas e pacientes, que também são dado clínico).
 *
 * ESCRITA continua exclusiva do papel profissional: criar, editar rascunho,
 * adendar e sobretudo ASSINAR são atos clínicos com responsabilidade
 * profissional (COREN) — não podem ser praticados por conta administrativa.
 */
const LEITURA_PRONTUARIO = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN];

@Controller('prontuarios')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, PermissoesGuard)
@RequerModulo(Modulo.PRONTUARIOS)
export class ProntuariosController {
  constructor(private readonly prontuariosService: ProntuariosService) {}

  @Post()
  @Roles(...PAPEIS_PROFISSIONAIS)
  create(
    @Body() dto: CreateProntuarioDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.create(dto, this.contextFromRequest(request, user));
  }

  @Get()
  @Roles(...LEITURA_PRONTUARIO)
  listByPaciente(
    @Query() query: ListProntuariosQueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.listByPaciente(query, this.contextFromRequest(request, user));
  }

  @Get('cid10/autocomplete')
  @Roles(...LEITURA_PRONTUARIO)
  autocompleteCid10(
    @Query() query: Cid10QueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.autocompleteCid10(
      query.q,
      query.limit,
      this.contextFromRequest(request, user),
    );
  }

  @Get(':id')
  @Roles(...LEITURA_PRONTUARIO)
  findOne(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.findOne(prontuarioId, clinicaId, this.contextFromRequest(request, user));
  }

  @Patch(':id')
  @Roles(...PAPEIS_PROFISSIONAIS)
  updateDraft(
    @Param('id') prontuarioId: string,
    @Body() dto: UpdateProntuarioDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.updateDraft(
      prontuarioId,
      dto,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  @Post(':id/assinar')
  @Roles(...PAPEIS_PROFISSIONAIS)
  sign(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.sign(prontuarioId, clinicaId, this.contextFromRequest(request, user));
  }

  @Post(':id/addendums')
  @Roles(...PAPEIS_PROFISSIONAIS)
  createAddendum(
    @Param('id') prontuarioId: string,
    @Body() dto: CreateAddendumDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.createAddendum(
      prontuarioId,
      dto,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  @Get(':id/addendums')
  @Roles(...LEITURA_PRONTUARIO)
  listAddendums(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.listAddendums(
      prontuarioId,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): ProntuarioRequestContext {
    return {
      ...extractRequestMeta(request),
      user,
    };
  }
}
