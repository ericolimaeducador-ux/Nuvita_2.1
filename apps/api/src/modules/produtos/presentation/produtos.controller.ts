import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CreateProdutoDto, ListProdutosQueryDto, UpdateProdutoDto } from '../application/dto/produto.dto';
import { ProdutosService } from '../application/produtos.service';

// O catalogo e dado de referencia usado em dois fluxos (venda no financeiro e
// indicacao de produto no cuidado da ferida), por isso a LEITURA e liberada a
// todo papel operacional e nao exige modulo — exigir FINANCEIRO daria 403 certo
// para o ENFERMEIRO, que nunca recebe esse modulo. Cadastro/alteracao de preco
// e do ADMIN.
const LEITURA_CATALOGO = [Papel.ENFERMEIRO, Papel.SECRETARIA, Papel.ADMIN];

@Controller('produtos')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class ProdutosController {
  constructor(private readonly service: ProdutosService) {}

  @Get()
  @Roles(...LEITURA_CATALOGO)
  listar(@Query() query: ListProdutosQueryDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.listar(user, query.tipo, query.clinicaId);
  }

  @Get(':id')
  @Roles(...LEITURA_CATALOGO)
  buscar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.buscar(user, id, clinicaId);
  }

  @Post()
  @Roles(Papel.ADMIN)
  criar(
    @Body() dto: CreateProdutoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.criar(user, dto, clinicaId);
  }

  @Patch(':id')
  @Roles(Papel.ADMIN)
  atualizar(
    @Param('id') id: string,
    @Body() dto: UpdateProdutoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.atualizar(user, id, dto, clinicaId);
  }

  @Delete(':id')
  @Roles(Papel.ADMIN)
  desativar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.desativar(user, id, clinicaId);
  }
}
