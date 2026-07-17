import { Papel } from './papel.enum';
import { Modulo } from './permissao';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  papel: Papel;
  clinicaId?: string | null;
  /** Nome do usuário — usado p/ atribuir autoria em documentos (ex.: ficha de avaliação). */
  nome?: string;
  /** Registro do conselho profissional (CRM/COREN/OAB) — evita redigitar em cada documento. */
  registroProfissional?: string;
  /**
   * Permissões efetivas de módulos calculadas na emissão do token
   * (resolvePermissoes). O PermissoesGuard usa isto; revogações passam a
   * valer no próximo refresh (TTL curto do access token limita a janela).
   * Ausente em tokens antigos — o guard cai no padrão do papel.
   */
  permissoes?: Modulo[];
  jti: string;
  typ: 'access' | 'refresh';
}
