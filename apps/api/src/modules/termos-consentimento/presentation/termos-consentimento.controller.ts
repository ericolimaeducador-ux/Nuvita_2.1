import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
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
import { RequestAuditContext, TermosConsentimentoService } from '../application/termos-consentimento.service';
import { CreateTermoConsentimentoDto } from '../application/dto/create-termo-consentimento.dto';
import { AssinarTermoConsentimentoDto } from '../application/dto/assinar-termo-consentimento.dto';

// Termo é documento do paciente (mesmo módulo que já cobre upload de
// documentos) — quem conduz o atendimento pode criar/assinar/ler.
const OPERA_TERMO = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('termos-consentimento')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, PermissoesGuard)
@RequerModulo(Modulo.DOCUMENTOS)
@Roles(...OPERA_TERMO)
export class TermosConsentimentoController {
  constructor(private readonly service: TermosConsentimentoService) {}

  @Post()
  create(@Body() dto: CreateTermoConsentimentoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.service.create(dto, this.ctx(req, user));
  }

  @Get()
  listByPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.service.listByPaciente(pacienteId, clinicaId, this.ctx(req, user));
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.service.findById(id, clinicaId, this.ctx(req, user));
  }

  @Post(':id/assinar')
  assinar(
    @Param('id') id: string,
    @Body() dto: AssinarTermoConsentimentoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.service.assinar(id, dto, clinicaId, this.ctx(req, user));
  }

  private ctx(req: Request, user: AuthTokenPayload): RequestAuditContext {
    return { ...extractRequestMeta(req), user };
  }
}
