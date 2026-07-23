export const PLANO_CUIDADOS_REPOSITORY = Symbol('PLANO_CUIDADOS_REPOSITORY');
export const CATALOGO_CLINICO_REPOSITORY = Symbol('CATALOGO_CLINICO_REPOSITORY');

/** Teto de fenômenos candidatos enviados ao modelo por chamada. */
export const MAX_FENOMENOS_CANDIDATOS_PADRAO = 15;

/** Teto de diagnósticos por plano — mais que isso deixa de ser plano e vira lista. */
export const MAX_DIAGNOSTICOS_PADRAO = 5;

/**
 * Modelo padrão. `claude-sonnet-4-6` foi a escolha explícita da especificação;
 * trocável por `CIPE_AI_MODEL` sem alterar código.
 */
export const MODELO_IA_PADRAO = 'claude-sonnet-4-6';
