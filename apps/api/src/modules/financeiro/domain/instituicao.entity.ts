/**
 * Cliente institucional da consultoria (receita B2B): hospital, clinica ou
 * instituicao de longa permanencia para idosos (ILPI).
 *
 * Nao e um `Paciente` nem uma `Clinica` (tenant) — e um terceiro com quem a
 * clinica mantem contrato. Existe para responder "quanto faturei com o Hospital
 * X neste ano", o que a categoria de texto livre nao permitia.
 */
export enum TipoInstituicao {
  HOSPITAL = 'hospital',
  CLINICA = 'clinica',
  ILPI = 'ilpi',
  OUTRO = 'outro',
}

export const TIPO_INSTITUICAO_LABEL: Record<TipoInstituicao, string> = {
  [TipoInstituicao.HOSPITAL]: 'Hospital',
  [TipoInstituicao.CLINICA]: 'Clinica',
  [TipoInstituicao.ILPI]: 'Instituicao de longa permanencia (ILPI)',
  [TipoInstituicao.OUTRO]: 'Outro',
};

export interface Instituicao {
  id: string;
  clinicaId: string;
  nome: string;
  tipo: TipoInstituicao;
  /** Somente digitos, sem mascara. */
  cnpj?: string;
  contatoNome?: string;
  contatoEmail?: string;
  contatoTelefone?: string;
  observacoes?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm?: Date;
}
