import { BadRequestException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { Etiologia, StatusFerida } from '../domain/ferida.entity';
import { NivelExsudato } from '../domain/avaliacao-ferida.entity';
import { AvaliacaoFeridaRepository } from './ports/avaliacao-ferida.repository';
import { FeridasService } from './feridas.service';
import { AvaliacaoFeridaService } from './avaliacao-ferida.service';

describe('AvaliacaoFeridaService', () => {
  const user: AuthTokenPayload = {
    sub: 'u1', email: 'enf@clinica.com', papel: Papel.ENFERMEIRO, clinicaId: 'clinica-A',
    jti: 'jti-1', typ: 'access',
  };
  const context = { ip: '127.0.0.1', userAgent: 'jest', user };

  const feridaPeDiabetico = {
    id: 'ferida-1', clinicaId: 'clinica-A', pacienteId: 'p1', rotulo: 'Pé',
    etiologia: Etiologia.PE_DIABETICO, localizacao: 'Pé esquerdo', status: StatusFerida.ATIVA,
    criadoEm: new Date(), atualizadoEm: new Date(),
  };

  let avaliacoes: jest.Mocked<AvaliacaoFeridaRepository>;
  let auditLogs: jest.Mocked<AuditLogRepository>;
  let notificacoes: jest.Mocked<Pick<NotificacoesService, 'notificarRiscoFerida'>>;
  let feridasService: jest.Mocked<Pick<FeridasService, 'findOne'>>;
  let service: AvaliacaoFeridaService;

  const dtoBase = {
    medicao: { comprimentoCm: 2, larguraCm: 3, profundidadeCm: 0.5 },
    tecido: { granulacaoPct: 50, epitelizacaoPct: 0, esfaceloPct: 0, necrosePct: 0 },
    exsudato: NivelExsudato.BAIXO,
  };

  beforeEach(() => {
    avaliacoes = {
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'av1', criadoEm: new Date(), ...data })),
      findById: jest.fn(),
      listByFerida: jest.fn(),
    };
    auditLogs = { create: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;
    notificacoes = { notificarRiscoFerida: jest.fn() };
    feridasService = { findOne: jest.fn().mockResolvedValue(feridaPeDiabetico) };

    service = new AvaliacaoFeridaService(
      avaliacoes,
      auditLogs,
      notificacoes as unknown as NotificacoesService,
      feridasService as unknown as FeridasService,
    );
  });

  it('rejeita quando a soma do perfil tecidual excede 100%', async () => {
    await expect(
      service.create('ferida-1', { ...dtoBase, tecido: { granulacaoPct: 60, epitelizacaoPct: 30, esfaceloPct: 20, necrosePct: 0 } }, undefined, context),
    ).rejects.toThrow(BadRequestException);
    expect(avaliacoes.create).not.toHaveBeenCalled();
  });

  it('calcula areaCm2 automaticamente quando não informada (comprimento × largura)', async () => {
    await service.create('ferida-1', dtoBase, undefined, context);
    expect(avaliacoes.create).toHaveBeenCalledWith(
      expect.objectContaining({ medicao: expect.objectContaining({ areaCm2: 6 }) }),
    );
  });

  it('dispara notificação de risco quando a recomendação de maior risco é alta/urgente (pé diabético + perfusão ruim)', async () => {
    await service.create('ferida-1', { ...dtoBase, perfusaoRuim: true }, undefined, context);

    expect(notificacoes.notificarRiscoFerida).toHaveBeenCalledWith('clinica-A', 'p1', 'Paciente');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'WOUND_ASSESSMENT_CREATED', metadata: expect.objectContaining({ maiorRisco: 'alto' }) }),
    );
  });

  it('NÃO dispara notificação quando o maior risco é baixo/moderado', async () => {
    feridasService.findOne = jest.fn().mockResolvedValue({ ...feridaPeDiabetico, etiologia: Etiologia.DESCONHECIDA });
    await service.create('ferida-1', dtoBase, undefined, context);

    expect(notificacoes.notificarRiscoFerida).not.toHaveBeenCalled();
  });
});
