import { Produto, TipoProduto } from '../../domain/produto.entity';

export type CreateProdutoInput = Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>;
export type UpdateProdutoInput = Partial<Omit<Produto, 'id' | 'clinicaId' | 'criadoEm' | 'atualizadoEm'>>;

export interface ProdutoRepository {
  findById(clinicaId: string, id: string): Promise<Produto | null>;
  findAll(clinicaId: string, tipo?: TipoProduto, apenasAtivos?: boolean): Promise<Produto[]>;
  create(data: CreateProdutoInput): Promise<Produto>;
  update(clinicaId: string, id: string, data: UpdateProdutoInput): Promise<Produto | null>;
  /** Baixa logica — preserva o vinculo com lancamentos ja emitidos. */
  desativar(clinicaId: string, id: string): Promise<Produto | null>;
}
