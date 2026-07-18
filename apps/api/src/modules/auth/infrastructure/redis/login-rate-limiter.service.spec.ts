import { HttpException } from '@nestjs/common';
import Redis from 'ioredis';
import { LoginRateLimiterService } from './login-rate-limiter.service';

/** Redis fake em memória — o suficiente pros comandos usados pelo limiter. */
function fakeRedis() {
  const values = new Map<string, string>();
  const ttls = new Map<string, number>();
  return {
    get: jest.fn(async (key: string) => values.get(key) ?? null),
    incr: jest.fn(async (key: string) => {
      const next = Number(values.get(key) ?? '0') + 1;
      values.set(key, String(next));
      return next;
    }),
    expire: jest.fn(async (key: string, seconds: number) => void ttls.set(key, seconds)),
    set: jest.fn(async (key: string, value: string, _ex: string, seconds: number) => {
      values.set(key, value);
      ttls.set(key, seconds);
    }),
    ttl: jest.fn(async (key: string) => (values.has(key) ? ttls.get(key) ?? -1 : -2)),
    del: jest.fn(async (...keys: string[]) => {
      for (const key of keys) {
        values.delete(key);
        ttls.delete(key);
      }
      return keys.length;
    }),
  };
}

describe('LoginRateLimiterService — lockout progressivo por conta', () => {
  const email = 'ana@clinica.com';
  let redis: ReturnType<typeof fakeRedis>;
  let service: LoginRateLimiterService;

  beforeEach(() => {
    redis = fakeRedis();
    service = new LoginRateLimiterService(redis as unknown as Redis);
  });

  it('não trava antes do threshold e dobra a duração a cada falha a partir da 5ª', async () => {
    for (let i = 0; i < 4; i++) {
      expect(await service.recordAccountFailure(email)).toBeNull();
    }
    expect(await service.recordAccountFailure(email)).toBe(60); // 5ª falha
    expect(await service.recordAccountFailure(email)).toBe(120); // 6ª
    expect(await service.recordAccountFailure(email)).toBe(240); // 7ª
  });

  it('respeita o teto de 1h mesmo com muitas falhas', async () => {
    for (let i = 0; i < 20; i++) {
      await service.recordAccountFailure(email);
    }
    expect(await service.recordAccountFailure(email)).toBe(60 * 60);
  });

  it('assertAccountAllowed lança 429 enquanto o lock existe e libera após clearAccount', async () => {
    for (let i = 0; i < 5; i++) {
      await service.recordAccountFailure(email);
    }
    await expect(service.assertAccountAllowed(email)).rejects.toThrow(HttpException);

    await service.clearAccount(email);
    await expect(service.assertAccountAllowed(email)).resolves.toBeUndefined();
  });

  it('fail-open: Redis fora do ar não bloqueia o login', async () => {
    redis.ttl.mockRejectedValue(new Error('ETIMEDOUT'));
    redis.incr.mockRejectedValue(new Error('ETIMEDOUT'));
    await expect(service.assertAccountAllowed(email)).resolves.toBeUndefined();
    await expect(service.recordAccountFailure(email)).resolves.toBeNull();
  });
});
