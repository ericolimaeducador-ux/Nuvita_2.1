import { Papel } from './papel.enum';

/**
 * Módulos/funcionalidades que podem ser liberados ou restringidos por usuário.
 * São a unidade das "caixas de seleção" do super-admin e do gate de menu/rotas
 * no frontend. O backend continua com o RolesGuard como trava dura de papel;
 * a permissão é uma camada ADICIONAL de refinamento por usuário.
 */
export enum Modulo {
  DASHBOARD = 'DASHBOARD',
  PACIENTES = 'PACIENTES',
  AGENDA = 'AGENDA',
  PRONTUARIOS = 'PRONTUARIOS',
  DOCUMENTOS = 'DOCUMENTOS',
  FINANCEIRO = 'FINANCEIRO',
  NOTIFICACOES = 'NOTIFICACOES',
  TELEMEDICINA = 'TELEMEDICINA',
  FERIDAS = 'FERIDAS',
  ANALYTICS = 'ANALYTICS',
  CLINICA = 'CLINICA',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const TODOS_MODULOS: Modulo[] = Object.values(Modulo);

export const MODULO_LABEL: Record<Modulo, string> = {
  [Modulo.DASHBOARD]: 'Dashboard',
  [Modulo.PACIENTES]: 'Pacientes',
  [Modulo.AGENDA]: 'Agenda',
  [Modulo.PRONTUARIOS]: 'Prontuários',
  [Modulo.DOCUMENTOS]: 'Documentos',
  [Modulo.FINANCEIRO]: 'Financeiro',
  [Modulo.NOTIFICACOES]: 'Notificações',
  [Modulo.TELEMEDICINA]: 'Telemedicina',
  [Modulo.FERIDAS]: 'Feridas',
  [Modulo.ANALYTICS]: 'Relatórios / analytics',
  [Modulo.CLINICA]: 'Configuração da clínica',
  [Modulo.SUPER_ADMIN]: 'Super Admin',
};

const M = Modulo;

/** Módulos que cada papel enxerga por padrão (o admin ajusta por usuário). */
export const PERMISSOES_PADRAO_POR_PAPEL: Record<Papel, Modulo[]> = {
  [Papel.SUPER_ADMIN]: TODOS_MODULOS,
  [Papel.ADMIN]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS, M.FINANCEIRO,
    M.NOTIFICACOES, M.TELEMEDICINA, M.FERIDAS,
    M.ANALYTICS, M.CLINICA,
  ],
  [Papel.MEDICO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS, M.TELEMEDICINA,
    M.FERIDAS,
  ],
  [Papel.ENFERMEIRO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS,
    M.FERIDAS, M.TELEMEDICINA,
  ],
  [Papel.ADVOGADO]: [
    M.DASHBOARD, M.PACIENTES, M.PRONTUARIOS, M.DOCUMENTOS,
  ],
  // As sessões de psicoterapia são registradas pelo prontuário comum (tipo
  // psicoterapia); o financeiro é o único livro-caixa da clínica (M.FINANCEIRO),
  // visível só a quem recebe pagamento (admin/secretaria).
  [Papel.PSICOLOGO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS, M.TELEMEDICINA,
  ],
  [Papel.SECRETARIA]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS, M.FINANCEIRO, M.NOTIFICACOES,
  ],
  [Papel.PACIENTE]: [M.DASHBOARD],
};

/**
 * Permissões efetivas = padrão do papel ∪ concedidas − revogadas.
 * SUPER_ADMIN sempre tem acesso total, independentemente das exceções.
 */
export function resolvePermissoes(
  papel: Papel,
  concedidas: Modulo[] = [],
  revogadas: Modulo[] = [],
): Modulo[] {
  if (papel === Papel.SUPER_ADMIN) return TODOS_MODULOS;
  const base = new Set<Modulo>(PERMISSOES_PADRAO_POR_PAPEL[papel] ?? []);
  for (const m of concedidas) base.add(m);
  for (const m of revogadas) base.delete(m);
  return TODOS_MODULOS.filter((m) => base.has(m));
}

export function temPermissao(permissoes: Modulo[] | undefined, modulo: Modulo): boolean {
  return !!permissoes && permissoes.includes(modulo);
}
