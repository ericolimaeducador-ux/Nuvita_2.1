/**
 * Tabela de precos da clinica: cada servico cobravel com seu valor vigente.
 *
 * O valor aqui e apenas o PADRAO sugerido — ao criar o lancamento o valor e
 * copiado para dentro dele (`Lancamento.valor`) e continua editavel (desconto,
 * caso especial). Reajustar a tabela depois NAO altera lancamentos ja emitidos,
 * porque o lancamento guarda o proprio valor, nao uma referencia viva ao preco.
 */
export enum TipoServico {
  CONSULTA = 'consulta',
  AVALIACAO_AVULSA = 'avaliacao_avulsa',
  CONSULTORIA = 'consultoria',
  OUTRO = 'outro',
}

export const TIPO_SERVICO_LABEL: Record<TipoServico, string> = {
  [TipoServico.CONSULTA]: 'Consulta',
  [TipoServico.AVALIACAO_AVULSA]: 'Avaliacao avulsa de ferida',
  [TipoServico.CONSULTORIA]: 'Consultoria',
  [TipoServico.OUTRO]: 'Outro',
};

export interface Servico {
  id: string;
  clinicaId: string;
  nome: string;
  tipo: TipoServico;
  /** Preco sugerido em reais. */
  preco: number;
  descricao?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm?: Date;
}
