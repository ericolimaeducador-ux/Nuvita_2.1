import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { PermissoesGuard } from '../../auth/presentation/guards/permissoes.guard';
import { RequerModulo } from '../../auth/presentation/decorators/requer-modulo.decorator';
import { Modulo } from '../../../../../../packages/shared/src/auth';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ReceituarioEnfermagemService } from '../application/receituario-enfermagem.service';
import { CreateReceituarioEnfermagemDto } from '../application/dto/create-receituario-enfermagem.dto';

// Documentação clínica de enfermagem — mesmo módulo que já cobre o SOAP/
// registro de enfermagem. Só ENFERMEIRO prescreve; leitura/impressão
// também abre para quem administra o atendimento (admin/secretaria).
@Controller('receituario-enfermagem')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, PermissoesGuard)
@RequerModulo(Modulo.PRONTUARIOS)
export class ReceituarioEnfermagemController {
  constructor(private readonly service: ReceituarioEnfermagemService) {}

  @Post()
  @Roles(Papel.ENFERMEIRO)
  create(@Body() dto: CreateReceituarioEnfermagemDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(Papel.ENFERMEIRO, Papel.ADMIN, Papel.SECRETARIA)
  listByPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByPaciente(pacienteId, clinicaId, user);
  }

  @Get(':id')
  @Roles(Papel.ENFERMEIRO, Papel.ADMIN, Papel.SECRETARIA)
  findById(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.findById(id, clinicaId, user);
  }
}
