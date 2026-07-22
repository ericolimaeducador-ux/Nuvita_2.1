import { Inject, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { Produto, TipoProduto } from '../domain/produto.entity';
import { ProdutoDocument, ProdutoMongo } from '../infrastructure/mongo/produto.schema';
import { PRODUTO_REPOSITORY } from '../produtos.constants';
import { CreateProdutoDto, UpdateProdutoDto } from './dto/produto.dto';
import { ProdutoRepository } from './ports/produto.repository';

@Injectable()
export class ProdutosService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProdutosService.name);

  constructor(
    @Inject(PRODUTO_REPOSITORY) private readonly produtos: ProdutoRepository,
    @InjectModel(ProdutoMongo.name) private readonly model: Model<ProdutoDocument>,
  ) {}

  /**
   * O catalogo NAO e mais semeado pelo codigo: cada clinica cadastra os proprios
   * produtos, com os proprios precos. O que roda no boot e so a limpeza do
   * catalogo antigo — global e de incontinencia urinaria (cateteres uretrais e
   * coletores), resquicio da base herdada do Nuvita original.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.removerCatalogoLegado();
  }

  /**
   * Idempotente e obrigatoria: o schema antigo declarava `codigo` como indice
   * UNICO global. Sem derrubar esse indice, o segundo produto cadastrado (todos
   * agora sem `codigo`) quebraria com E11000 em `codigo: null`.
   *
   * Os demais indices listados apontam para campos que sumiram junto com o
   * modelo de cateter (projeto/SIAFISICO/descricaoTecnica) — nao quebram nada,
   * mas sao removidos para nao deixar indice orfao ocupando espaco e confundindo
   * quem for inspecionar a colecao.
   */
  private async removerCatalogoLegado(): Promise<void> {
    const CAMPOS_LEGADOS = ['codigo', 'codigoFabricante', 'projeto', 'codigoSiafisico', 'descricaoTecnica'];

    try {
      const indices = await this.model.collection.indexes();
      for (const indice of indices) {
        if (!indice.name || indice.name === '_id_') continue;

        // Indice de texto guarda os campos em `weights`, nao em `key`
        // (a key vira {_fts, _ftsx}) — por isso os dois sao inspecionados.
        const campos = [...Object.keys(indice.key ?? {}), ...Object.keys(indice.weights ?? {})];
        if (campos.some((campo) => CAMPOS_LEGADOS.includes(campo))) {
          await this.model.collection.dropIndex(indice.name);
          this.logger.log(`Indice legado removido do catalogo de produtos: ${indice.name}`);
        }
      }

      // Itens antigos nao tem clinicaId (eram globais): ja ficariam invisiveis
      // pelo filtro de tenant, mas sao apagados para nao deixar catalogo de
      // incontinencia urinaria no banco.
      const { deletedCount } = await this.model.collection.deleteMany({ clinicaId: { $exists: false } });
      if (deletedCount) {
        this.logger.log(`${deletedCount} produto(s) do catalogo legado removido(s).`);
      }
    } catch (error) {
      // Colecao ainda inexistente (primeiro boot) e o caso normal, nao um erro.
      this.logger.debug(`Limpeza do catalogo legado ignorada: ${(error as Error).message}`);
    }
  }

  async listar(
    user: AuthTokenPayload,
    tipo?: TipoProduto,
    clinicaId?: string,
    incluirInativos?: boolean,
  ): Promise<Produto[]> {
    return this.produtos.findAll(resolveTenantClinicaId(user, clinicaId), tipo, !incluirInativos);
  }

  async buscar(user: AuthTokenPayload, id: string, clinicaId?: string): Promise<Produto> {
    const produto = await this.produtos.findById(resolveTenantClinicaId(user, clinicaId), id);
    if (!produto) throw new NotFoundException('Produto nao encontrado.');
    return produto;
  }

  async criar(user: AuthTokenPayload, dto: CreateProdutoDto, clinicaId?: string): Promise<Produto> {
    return this.produtos.create({
      clinicaId: resolveTenantClinicaId(user, clinicaId),
      nome: dto.nome,
      codigo: dto.codigo,
      subcategoria: dto.subcategoria,
      tipo: dto.tipo,
      precoVenda: dto.precoVenda,
      custo: dto.custo,
      unidade: dto.unidade,
      apresentacao: dto.apresentacao,
      fabricante: dto.fabricante,
      observacoes: dto.observacoes,
      ativo: true,
    });
  }

  async atualizar(user: AuthTokenPayload, id: string, dto: UpdateProdutoDto, clinicaId?: string): Promise<Produto> {
    const produto = await this.produtos.update(resolveTenantClinicaId(user, clinicaId), id, dto);
    if (!produto) throw new NotFoundException('Produto nao encontrado.');
    return produto;
  }

  /** Baixa logica: preserva o vinculo com lancamentos ja emitidos. */
  async desativar(user: AuthTokenPayload, id: string, clinicaId?: string): Promise<Produto> {
    const produto = await this.produtos.desativar(resolveTenantClinicaId(user, clinicaId), id);
    if (!produto) throw new NotFoundException('Produto nao encontrado.');
    return produto;
  }
}
