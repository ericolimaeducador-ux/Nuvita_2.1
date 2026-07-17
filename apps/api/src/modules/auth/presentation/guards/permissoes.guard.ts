import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AuthTokenPayload,
  MODULO_LABEL,
  Modulo,
  Papel,
  PERMISSOES_PADRAO_POR_PAPEL,
} from '../../../../../../../packages/shared/src/auth';
import { REQUER_MODULO_KEY } from '../decorators/requer-modulo.decorator';

/**
 * Aplica no backend as permissões finas por módulo (resolvePermissoes) que o
 * super-admin concede/revoga por usuário — antes elas só gateavam menu/rotas
 * do frontend, e a API aceitava qualquer papel autorizado pelo RolesGuard.
 *
 * As permissões efetivas viajam no JWT (calculadas na emissão do token);
 * revogações passam a valer no próximo refresh — janela limitada pelo TTL
 * curto do access token. Tokens antigos (sem o campo) caem no padrão do
 * papel, o mesmo fallback que o frontend usa para sessões antigas.
 */
@Injectable()
export class PermissoesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const moduloExigido = this.reflector.getAllAndOverride<Modulo | undefined>(REQUER_MODULO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!moduloExigido) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthTokenPayload }>();
    const user = request.user;

    // SUPER_ADMIN tem sempre todos os módulos (mesma regra de resolvePermissoes).
    if (user?.papel === Papel.SUPER_ADMIN) {
      return true;
    }

    const permissoes = user?.permissoes ?? (user ? (PERMISSOES_PADRAO_POR_PAPEL[user.papel] ?? []) : []);
    if (!permissoes.includes(moduloExigido)) {
      throw new ForbiddenException(`Modulo "${MODULO_LABEL[moduloExigido]}" nao habilitado para este usuario.`);
    }

    return true;
  }
}
