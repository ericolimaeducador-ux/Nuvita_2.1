import { NotificacaoWindowService } from './notificacao-window.service';

// América/São_Paulo é UTC-3 (sem horário de verão desde 2019) — datas em UTC
// abaixo já convertidas para deixar o teste determinístico.
describe('NotificacaoWindowService', () => {
  const service = new NotificacaoWindowService();

  it('não adia quando já está dentro da janela (10h em São Paulo)', () => {
    const base = new Date('2026-01-15T13:00:00Z'); // 10:00 em SP
    expect(service.nextAllowedDate(base).getTime()).toBe(base.getTime());
  });

  it('adia para as 8h quando o horário atual é antes da janela (3h em São Paulo)', () => {
    const base = new Date('2026-01-15T06:00:00Z'); // 03:00 em SP
    const esperado = new Date('2026-01-15T11:00:00Z'); // 08:00 em SP
    expect(service.nextAllowedDate(base).getTime()).toBe(esperado.getTime());
  });

  it('adia para as 8h do dia seguinte quando o horário atual é depois da janela (23h em São Paulo)', () => {
    const base = new Date('2026-01-16T02:00:00Z'); // 23:00 (dia 15) em SP
    const esperado = new Date('2026-01-16T11:00:00Z'); // 08:00 (dia 16) em SP
    expect(service.nextAllowedDate(base).getTime()).toBe(esperado.getTime());
  });

  it('não inclui o limite superior — 22h em São Paulo já conta como fora da janela', () => {
    const base = new Date('2026-01-16T01:00:00Z'); // 22:00 em SP
    expect(service.nextAllowedDate(base).getTime()).not.toBe(base.getTime());
  });

  it('delayUntilAllowed não retorna negativo quando o horário já é permitido', () => {
    expect(service.delayUntilAllowed(new Date())).toBeGreaterThanOrEqual(0);
  });
});
