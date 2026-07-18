import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  ACCOUNT_FAILURE_WINDOW_SECONDS,
  ACCOUNT_LOCKOUT_BASE_SECONDS,
  ACCOUNT_LOCKOUT_MAX_SECONDS,
  ACCOUNT_LOCKOUT_THRESHOLD,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  REDIS_CLIENT,
} from '../../auth.constants';

@Injectable()
export class LoginRateLimiterService {
  private readonly logger = new Logger(LoginRateLimiterService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertAllowed(ip: string): Promise<void> {
    // Fail-open: se o Redis estiver fora, o login continua funcionando sem o
    // limite (já houve ETIMEDOUT/EPIPE em produção). O ThrottlerGuard do
    // /auth segue como camada de proteção em memória.
    let attempts: number;
    try {
      attempts = Number(await this.redis.get(this.key(ip)));
    } catch (err) {
      this.logger.warn(`Redis indisponivel no rate limiter de login (fail-open): ${(err as Error).message}`);
      return;
    }
    if (attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
      throw new HttpException('Muitas tentativas de login. Tente novamente em 15 minutos.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordFailure(ip: string): Promise<void> {
    try {
      const key = this.key(ip);
      await this.redis.incr(key);
      // TTL renovado a cada falha (janela deslizante): também recupera uma
      // chave que tenha ficado sem TTL se um expire anterior falhou no meio.
      await this.redis.expire(key, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao registrar falha de login: ${(err as Error).message}`);
    }
  }

  async clear(ip: string): Promise<void> {
    try {
      await this.redis.del(this.key(ip));
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao limpar falhas de login: ${(err as Error).message}`);
    }
  }

  /** Bloqueia o login se a conta estiver em lockout progressivo. Fail-open como o limite por IP. */
  async assertAccountAllowed(email: string): Promise<void> {
    let lockTtl: number;
    try {
      lockTtl = await this.redis.ttl(this.lockKey(email));
    } catch (err) {
      this.logger.warn(`Redis indisponivel no lockout por conta (fail-open): ${(err as Error).message}`);
      return;
    }
    if (lockTtl > 0) {
      const minutos = Math.max(1, Math.ceil(lockTtl / 60));
      throw new HttpException(
        `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${minutos} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Registra falha de login na conta. A partir do threshold, trava a conta com
   * duração dobrando a cada falha extra (60s, 120s, ... até 1h). Retorna a
   * duração do lock aplicado agora, ou null se a conta ainda não travou.
   */
  async recordAccountFailure(email: string): Promise<number | null> {
    try {
      const key = this.accountKey(email);
      const failures = await this.redis.incr(key);
      await this.redis.expire(key, ACCOUNT_FAILURE_WINDOW_SECONDS);
      if (failures < ACCOUNT_LOCKOUT_THRESHOLD) {
        return null;
      }
      const lockSeconds = Math.min(
        ACCOUNT_LOCKOUT_BASE_SECONDS * 2 ** (failures - ACCOUNT_LOCKOUT_THRESHOLD),
        ACCOUNT_LOCKOUT_MAX_SECONDS,
      );
      await this.redis.set(this.lockKey(email), '1', 'EX', lockSeconds);
      return lockSeconds;
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao registrar falha por conta: ${(err as Error).message}`);
      return null;
    }
  }

  async clearAccount(email: string): Promise<void> {
    try {
      await this.redis.del(this.accountKey(email), this.lockKey(email));
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao limpar falhas por conta: ${(err as Error).message}`);
    }
  }

  private key(ip: string): string {
    return `auth:login-failures:${ip}`;
  }

  private accountKey(email: string): string {
    return `auth:account-failures:${email}`;
  }

  private lockKey(email: string): string {
    return `auth:account-lock:${email}`;
  }
}
