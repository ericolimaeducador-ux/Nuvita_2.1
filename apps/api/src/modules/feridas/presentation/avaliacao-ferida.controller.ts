import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CreateAvaliacaoFeridaDto } from '../application/dto/create-avaliacao-ferida.dto';
import { AvaliacaoFeridaRequestContext, AvaliacaoFeridaService } from '../application/avaliacao-ferida.service';

const LEITURA_FERIDAS = [Papel.MEDICO, Papel.ENFERMEIRO, Papel.ADMIN, Papel.SECRETARIA];
const MUTACAO_FERIDAS = [Papel.MEDICO, Papel.ENFERMEIRO, Papel.ADMIN];

/** Só POST/GET — avaliação é imutável por construção, sem PATCH/DELETE (ver AvaliacaoFerida no domínio). */
@Controller('feridas/:feridaId/avaliacoes')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class AvaliacaoFeridaController {
  constructor(private readonly service: AvaliacaoFeridaService) {}

  @Post()
  @Roles(...MUTACAO_FERIDAS)
  create(
    @Param('feridaId') feridaId: string,
    @Body() dto: CreateAvaliacaoFeridaDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.create(feridaId, dto, clinicaId, this.contextFromRequest(request, user));
  }

  @Get()
  @Roles(...LEITURA_FERIDAS)
  listByFerida(
    @Param('feridaId') feridaId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.listByFerida(feridaId, clinicaId, this.contextFromRequest(request, user));
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

  private contextFromRequest(request: Request, user: AuthTokenPayload): AvaliacaoFeridaRequestContext {
    return { ...extractRequestMeta(request), user };
  }
}
