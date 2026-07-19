import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AppConfigService } from '../../../common/security/config.service';
import { User } from '../domain/user.entity';
import { AuditLogRepository } from './ports/audit-log.repository';
import { UserRepository } from './ports/user.repository';
import { LoginRateLimiterService } from '../infrastructure/redis/login-rate-limiter.service';
import { TokenRevocationService } from '../infrastructure/redis/token-revocation.service';
import { AuthService } from './auth.service';

/** Fluxo completo de sessão: login (com 2FA obrigatório para ENFERMEIRO) → refresh → logout. */
describe('AuthService — fluxo de autenticação', () => {
  const JWT_ACCESS_SECRET = 'access-secret-de-teste';
  const JWT_REFRESH_SECRET = 'refresh-secret-de-teste';
  const totpSecret = speakeasy.generateSecret({ length: 20 }).base32;

  let user: User;
  let users: jest.Mocked<UserRepository>;
  let auditLogs: jest.Mocked<AuditLogRepository>;
  let loginRateLimiter: jest.Mocked<LoginRateLimiterService>;
  let tokenRevocation: jest.Mocked<TokenRevocationService>;
  let service: AuthService;

  beforeEach(async () => {
    user = {
      id: 'user-1',
      nome: 'Dra. Ana',
      email: 'ana@clinica.com',
      passwordHash: await bcrypt.hash('senhaForte123', 4),
      papel: Papel.ENFERMEIRO,
      clinicaId: 'clinica-1',
      twoFactorSecret: totpSecret,
      ativo: true,
      criadoEm: new Date(),
    };

    users = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithSecrets: jest.fn().mockResolvedValue(user),
      findById: jest.fn().mockResolvedValue(user),
      findAll: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    auditLogs = { create: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;

    loginRateLimiter = {
      assertAllowed: jest.fn(),
      clear: jest.fn(),
      recordFailure: jest.fn(),
      assertAccountAllowed: jest.fn(),
      recordAccountFailure: jest.fn().mockResolvedValue(null),
      clearAccount: jest.fn(),
    } as unknown as jest.Mocked<LoginRateLimiterService>;

    // Revogação stateful: comporta-se como o Redis real (revogar → isRevoked
    // passa a responder true), essencial pros cenários de reuso de refresh.
    const revokedJtis = new Set<string>();
    const revokedFamilies = new Set<string>();
    tokenRevocation = {
      revoke: jest.fn(async (jti: string) => void revokedJtis.add(jti)),
      isRevoked: jest.fn(async (jti: string) => revokedJtis.has(jti)),
      revokeFamily: jest.fn(async (fam: string) => void revokedFamilies.add(fam)),
      isFamilyRevoked: jest.fn(async (fam: string) => revokedFamilies.has(fam)),
    } as unknown as jest.Mocked<TokenRevocationService>;

    const configService = {
      getConfig: () => ({
        jwtAccessSecret: JWT_ACCESS_SECRET,
        jwtRefreshSecret: JWT_REFRESH_SECRET,
        bcryptRounds: 4,
      }),
    } as unknown as AppConfigService;

    service = new AuthService(
      users,
      auditLogs,
      new JwtService(),
      configService,
      loginRateLimiter,
      tokenRevocation,
    );
  });

  const context = { ip: '127.0.0.1', userAgent: 'jest' };

  it('rejeita login sem código 2FA para papel que exige (MEDICO)', async () => {
    await expect(
      service.login({ email: user.email, password: 'senhaForte123' }, context),
    ).rejects.toThrow(UnauthorizedException);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'LOGIN_FAILURE', metadata: { reason: 'INVALID_2FA' } }),
    );
  });

  it('rejeita login com senha incorreta', async () => {
    await expect(
      service.login({ email: user.email, password: 'senha-errada' }, context),
    ).rejects.toThrow(UnauthorizedException);
    expect(loginRateLimiter.recordFailure).toHaveBeenCalledWith(context.ip);
  });

  it('completa login → refresh → logout com código 2FA válido', async () => {
    const totpCode = speakeasy.totp({ secret: totpSecret, encoding: 'base32' });

    // 1) login
    const loginResult = await service.login({ email: user.email, password: 'senhaForte123', totpCode }, context);
    expect(loginResult.accessToken).toEqual(expect.any(String));
    expect(loginResult.refreshToken).toEqual(expect.any(String));
    expect(loginResult.user.email).toBe(user.email);
    expect(loginRateLimiter.clear).toHaveBeenCalledWith(context.ip);
    expect(auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ event: 'LOGIN_SUCCESS' }));

    // 2) refresh — deve revogar o refresh token antigo e emitir um par novo
    const refreshResult = await service.refresh(loginResult.refreshToken, context);
    expect(refreshResult.accessToken).toEqual(expect.any(String));
    expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken);
    expect(tokenRevocation.revoke).toHaveBeenCalled();
    expect(auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ event: 'TOKEN_REFRESH' }));

    // 3) logout — revoga o refresh token atual
    const accessPayload = await new JwtService().verifyAsync(refreshResult.accessToken, {
      secret: JWT_ACCESS_SECRET,
    });
    // Permissões efetivas viajam no token (consumidas pelo PermissoesGuard)
    expect(accessPayload.permissoes).toEqual(expect.arrayContaining(['PACIENTES', 'PRONTUARIOS']));
    await service.logout(accessPayload, refreshResult.refreshToken, context);
    expect(auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ event: 'LOGOUT' }));

    // 4) logout revogou a família — o access token da sessão morre junto
    expect(accessPayload.fam).toEqual(expect.any(String));
    await expect(service.validateAccessPayload(accessPayload)).rejects.toThrow(UnauthorizedException);
  });

  it('bloqueia login quando a conta está em lockout progressivo', async () => {
    (loginRateLimiter.assertAccountAllowed as jest.Mock).mockRejectedValue(
      new UnauthorizedException('Conta temporariamente bloqueada.'),
    );
    await expect(
      service.login({ email: user.email, password: 'senhaForte123' }, context),
    ).rejects.toThrow('Conta temporariamente bloqueada.');
    // Nem chegou a consultar o usuário — o lockout corta antes do bcrypt
    expect(users.findByEmailWithSecrets).not.toHaveBeenCalled();
  });

  it('audita ACCOUNT_LOCKED quando a falha dispara o lockout da conta', async () => {
    (loginRateLimiter.recordAccountFailure as jest.Mock).mockResolvedValue(60);
    await expect(
      service.login({ email: user.email, password: 'senha-errada' }, context),
    ).rejects.toThrow(UnauthorizedException);
    expect(loginRateLimiter.recordAccountFailure).toHaveBeenCalledWith(user.email);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ACCOUNT_LOCKED', metadata: { lockSeconds: 60 } }),
    );
  });

  it('reuso de refresh token já rotacionado revoga a família inteira (access + refresh)', async () => {
    const totpCode = speakeasy.totp({ secret: totpSecret, encoding: 'base32' });
    const loginResult = await service.login({ email: user.email, password: 'senhaForte123', totpCode }, context);

    // Rotação legítima: o refresh token do login é consumido e revogado
    const refreshResult = await service.refresh(loginResult.refreshToken, context);

    // Replay do token consumido (cenário de roubo) → família revogada + auditoria
    await expect(service.refresh(loginResult.refreshToken, context)).rejects.toThrow(
      'Sessao encerrada por seguranca. Faca login novamente.',
    );
    expect(tokenRevocation.revokeFamily).toHaveBeenCalled();
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'REFRESH_TOKEN_REUSE_DETECTED', userId: user.id }),
    );

    // O par novo (da vítima ou do atacante) também morreu: refresh e access
    await expect(service.refresh(refreshResult.refreshToken, context)).rejects.toThrow('Sessao encerrada.');
    const accessPayload = await new JwtService().verifyAsync(refreshResult.accessToken, {
      secret: JWT_ACCESS_SECRET,
    });
    await expect(service.validateAccessPayload(accessPayload)).rejects.toThrow('Sessao encerrada.');
  });
});
