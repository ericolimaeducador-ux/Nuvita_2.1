import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthTokenPayload, Modulo, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { RequerModulo } from '../../auth/presentation/decorators/requer-modulo.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { PermissoesGuard } from '../../auth/presentation/guards/permissoes.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { TipoTermoCatalogo } from '../domain/catalogo-clinico.entity';
import { GerarPlanoDto } from '../application/dto/gerar-plano.dto';
import { ReavaliarPlanoDto } from '../application/dto/reavaliar-plano.dto';
import { PlanoCuidadosService } from '../application/plano-cuidados.service';

const LEITURA = [Papel.ENFERMEIRO, Papel.ADMIN];
const MUTACAO = [Papel.ENFERMEIRO, Papel.ADMIN];

const TIPOS_TERMO: TipoTermoCatalogo[] = ['fenomeno', 'acao', 'resultado'];

/**
 * Sem PATCH/DELETE: plano gerado e evolução gravada são imutáveis por desenho,
 * como avaliação de ferida e receituário. A revisão se faz por nova evolução.
 */
@Controller('planos-cuidados')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, PermissoesGuard)
@RequerModulo(Modulo.PLANO_CUIDADOS)
export class PlanoCuidadosController {
  constructor(private readonly service: PlanoCuidadosService) {}

  /**
   * Throttle apertado: cada requisição dispara até 4 chamadas ao motor de
   * raciocínio. O limite global de 300/min não protege contra o custo disso.
   */
  @Post()
  @Roles(...MUTACAO)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  gerar(
    @Body() dto: GerarPlanoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.gerar(dto, this.resolverClinica(clinicaId, user), user.sub);
  }

  @Get('catalogo')
  @Roles(...LEITURA)
  buscarTermos(@Query('q') q: string, @Query('tipo') tipo?: string) {
    const tipoTermo = (tipo ?? 'fenomeno') as TipoTermoCatalogo;
    if (!TIPOS_TERMO.includes(tipoTermo)) {
      throw new BadRequestException(`tipo deve ser um de: ${TIPOS_TERMO.join(', ')}`);
    }
    return this.service.buscarTermos(q ?? '', tipoTermo);
  }

  @Get('paciente/:pacienteId')
  @Roles(...LEITURA)
  listarPorPaciente(
    @Param('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listarPorPaciente(pacienteId, this.resolverClinica(clinicaId, user));
  }

  @Get(':id')
  @Roles(...LEITURA)
  buscar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.buscarPorId(id, this.resolverClinica(clinicaId, user));
  }

  @Post(':id/evolucoes')
  @Roles(...MUTACAO)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  evoluir(
    @Param('id') id: string,
    @Body() dto: ReavaliarPlanoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.evoluir(id, dto, this.resolverClinica(clinicaId, user), user.sub);
  }

  /** Tenant vem do token; `?clinicaId=` divergente é 403, nunca override. */
  private resolverClinica(clinicaIdQuery: string | undefined, user: AuthTokenPayload): string {
    return resolveTenantClinicaId(user, clinicaIdQuery);
  }
}
