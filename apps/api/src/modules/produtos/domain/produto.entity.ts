/**
 * Catalogo de produtos para ferida que a clinica revende ao paciente
 * (curativos, coberturas, bolsas de estomia, adjuvantes).
 *
 * O catalogo e POR CLINICA e cadastrado pelo admin — nao ha lista fixa no
 * codigo. Cada clinica trabalha com marcas e precos proprios, e reajuste de
 * preco nao pode depender de deploy.
 */
export enum TipoProduto {
  CURATIVO = 'curativo',
  COBERTURA = 'cobertura',
  BOLSA_ESTOMIA = 'bolsa_estomia',
  ADJUVANTE = 'adjuvante',
  OUTRO = 'outro',
}

export const TIPO_PRODUTO_LABEL: Record<TipoProduto, string> = {
  [TipoProduto.CURATIVO]: 'Curativo',
  [TipoProduto.COBERTURA]: 'Cobertura',
  [TipoProduto.BOLSA_ESTOMIA]: 'Bolsa de estomia',
  [TipoProduto.ADJUVANTE]: 'Adjuvante',
  [TipoProduto.OUTRO]: 'Outro',
};

export interface Produto {
  id: string;
  clinicaId: string;
  nome: string;
  tipo: TipoProduto;
  /** Preco cobrado do paciente, em reais. */
  precoVenda: number;
  /** Custo de aquisicao — opcional, habilita a margem no relatorio. */
  custo?: number;
  /** Unidade de dispensacao (unidade, caixa, pacote...). */
  unidade?: string;
  /** Apresentacao/medida, ex. "10x10cm". */
  apresentacao?: string;
  fabricante?: string;
  observacoes?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm?: Date;
}
