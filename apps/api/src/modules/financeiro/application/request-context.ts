import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';

/**
 * Contexto de auditoria das operacoes financeiras.
 *
 * Vive em arquivo proprio (e nao dentro de um dos services) porque tanto
 * `FinanceiroService` quanto `RecorrenciasService`/`CadastrosFinanceirosService`
 * precisam do tipo — importa-lo de um service para o outro criaria um ciclo de
 * import entre modulos.
 */
export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}
