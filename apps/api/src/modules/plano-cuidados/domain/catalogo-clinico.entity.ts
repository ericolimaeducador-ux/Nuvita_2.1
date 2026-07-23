/**
 * Catálogo clínico de fenômenos, ações e resultados de enfermagem.
 *
 * IMPORTANTE — por que isto não se chama "CIPE".
 *
 * A CIPE®/ICNP® é taxonomia licenciada do ICN, com códigos próprios. Enquanto a
 * licença não estiver adquirida e o cruzamento com o material do curso do
 * projeto (Anatomia, Fundamentos, Cuidados com Estomas) não estiver feito,
 * carimbar um termo como CIPE® seria fixar identificador de instrumento sem
 * confirmação — exatamente o que a trava do CLAUDE.md proíbe. Agrava-se pelo
 * fato de o diagnóstico ir para registro clínico imutável: código errado gravado
 * hoje não é corrigível depois.
 *
 * Por isso todo termo nasce com `taxonomia: LOCAL_PROVISORIO` e
 * `codigoCipeOficial: null`. O campo existe para receber o código real quando a
 * licença chegar; até lá, a UI e o impresso dizem "catálogo clínico local".
 */

export enum TaxonomiaTermo {
  /** Termo do catálogo local, ainda não cruzado com a CIPE® licenciada. */
  LOCAL_PROVISORIO = 'LOCAL_PROVISORIO',
  /** Termo já cruzado e validado contra a CIPE® licenciada. */
  CIPE_VALIDADO = 'CIPE_VALIDADO',
}

/** Versão do catálogo, persistida em cada plano — mesmo padrão de `escalas.versao`. */
export const CATALOGO_CLINICO_VERSAO = 'catalogo-clinico-0.1.0';

export enum EixoFenomeno {
  FOCO = 'foco',
  JULGAMENTO = 'julgamento',
  MEIOS = 'meios',
  ACAO = 'acao',
  TEMPO = 'tempo',
  LOCALIZACAO = 'localizacao',
  CLIENTE = 'cliente',
}

export enum ContextoEstomaterapia {
  FERIDA_CRONICA = 'ferida_cronica',
  FERIDA_AGUDA = 'ferida_aguda',
  LESAO_PRESSAO = 'lesao_pressao',
  ESTOMA_COLOSTOMIA = 'estoma_colostomia',
  ESTOMA_ILEOSTOMIA = 'estoma_ileostomia',
  ESTOMA_UROSTOMIA = 'estoma_urostomia',
  INCONTINENCIA = 'incontinencia',
  FISTULA = 'fistula',
}

export enum TipoAcao {
  AUTONOMA = 'autonoma',
  INTERDEPENDENTE = 'interdependente',
  DELEGADA = 'delegada',
}

export interface CatalogoFenomeno {
  id: string;
  codigo: string;
  titulo: string;
  definicao?: string;
  eixo: EixoFenomeno;
  taxonomia: TaxonomiaTermo;
  /** Preenchido só quando a licença CIPE® permitir o cruzamento. */
  codigoCipeOficial: string | null;
  sinonimos: string[];
  manifestacoesClinicas: string[];
  fatoresRelacionados: string[];
  contextoEstomaterapia: ContextoEstomaterapia[];
  acoesVinculadas: string[];
  resultadosVinculados: string[];
  palavrasChave: string[];
}

export interface CatalogoAcao {
  id: string;
  codigo: string;
  titulo: string;
  definicao?: string;
  taxonomia: TaxonomiaTermo;
  codigoCipeOficial: string | null;
  atividades: string[];
  tipo: TipoAcao;
  frequenciasRecomendadas: string[];
  fenomenosVinculados: string[];
  palavrasChave: string[];
}

export interface IndicadorResultado {
  codigo: string;
  descricao: string;
}

export interface EscalaResultado {
  /** 'comprometimento' | 'frequencia' | 'gravidade' */
  tipo: string;
  descricao1: string;
  descricao5: string;
}

export interface CatalogoResultado {
  id: string;
  codigo: string;
  titulo: string;
  definicao?: string;
  taxonomia: TaxonomiaTermo;
  codigoCipeOficial: string | null;
  escala?: EscalaResultado;
  indicadores: IndicadorResultado[];
  fenomenosVinculados: string[];
  palavrasChave: string[];
}

export type TipoTermoCatalogo = 'fenomeno' | 'acao' | 'resultado';

/**
 * Rótulo de procedência para a UI e para o documento impresso. Enquanto for
 * provisório, nada pode sugerir ao paciente que aquilo é CIPE® oficial.
 */
export function rotuloProcedencia(taxonomia: TaxonomiaTermo): string {
  return taxonomia === TaxonomiaTermo.CIPE_VALIDADO
    ? 'CIPE® (ICNP®)'
    : 'catálogo clínico local (provisório)';
}
