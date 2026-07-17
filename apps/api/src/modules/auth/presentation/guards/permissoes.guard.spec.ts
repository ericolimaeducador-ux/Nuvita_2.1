import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenPayload, Modulo, Papel } from '../../../../../../../packages/shared/src/auth';
import { REQUER_MODULO_KEY } from '../decorators/requer-modulo.decorator';
import { PermissoesGuard } from './permissoes.guard';

function contextFor(user: Partial<AuthTokenPayload> | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(moduloExigido?: Modulo): PermissoesGuard {
  const reflector = {
    getAllAndOverride: (key: string) => (key === REQUER_MODULO_KEY ? moduloExigido : undefined),
  } as unknown as Reflector;
  return new PermissoesGuard(reflector);
}

describe('PermissoesGuard', () => {
  it('libera rotas sem @RequerModulo', () => {
    expect(guardWith(undefined).canActivate(contextFor({ papel: Papel.SECRETARIA }))).toBe(true);
  });

  it('libera quando o módulo exigido está nas permissões do token', () => {
    const guard = guardWith(Modulo.FERIDAS);
    const user = { papel: Papel.ENFERMEIRO, permissoes: [Modulo.DASHBOARD, Modulo.FERIDAS] };
    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('bloqueia quando o módulo foi revogado (ausente das permissões do token), mesmo com papel autorizado', () => {
    const guard = guardWith(Modulo.FERIDAS);
    const user = { papel: Papel.ENFERMEIRO, permissoes: [Modulo.DASHBOARD, Modulo.PACIENTES] };
    expect(() => guard.canActivate(contextFor(user))).toThrow(ForbiddenException);
  });

  it('token antigo sem permissoes cai no padrão do papel', () => {
    const guard = guardWith(Modulo.FERIDAS);
    // ENFERMEIRO tem FERIDAS por padrão; SECRETARIA não
    expect(guard.canActivate(contextFor({ papel: Papel.ENFERMEIRO }))).toBe(true);
    expect(() => guard.canActivate(contextFor({ papel: Papel.SECRETARIA }))).toThrow(ForbiddenException);
  });

  it('concessão individual no token libera módulo fora do padrão do papel', () => {
    const guard = guardWith(Modulo.FERIDAS);
    const user = { papel: Papel.SECRETARIA, permissoes: [Modulo.DASHBOARD, Modulo.FERIDAS] };
    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('SUPER_ADMIN sempre passa', () => {
    const guard = guardWith(Modulo.FERIDAS);
    expect(guard.canActivate(contextFor({ papel: Papel.SUPER_ADMIN, permissoes: [] }))).toBe(true);
  });
});
