import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { Etiologia, StatusFerida } from '../domain/ferida.entity';
import { FeridaRepository } from './ports/ferida.repository';
import { FeridasService } from './feridas.service';

/**
 * Isolamento de tenant é a garantia mais crítica do módulo: uma ferida de
 * outra clínica nunca pode ser lida/editada, mesmo que o id seja adivinhado.
 */
describe('FeridasService — isolamento de tenant', () => {
  const clinicaDoUsuario = 'clinica-A';
  const user: AuthTokenPayload = {
    sub: 'u1', email: 'enf@clinica.com', papel: Papel.ENFERMEIRO, clinicaId: clinicaDoUsuario,
    jti: 'jti-1', typ: 'access',
  };
  const context = { ip: '127.0.0.1', userAgent: 'jest', user };

  let feridas: jest.Mocked<FeridaRepository>;
  let auditLogs: jest.Mocked<AuditLogRepository>;
  let pacientesService: jest.Mocked<Pick<PacientesService, 'findOne'>>;
  let service: FeridasService;

  beforeEach(() => {
    feridas = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      listByPaciente: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<FeridaRepository>;
    auditLogs = { create: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;
    pacientesService = { findOne: jest.fn() };

    service = new FeridasService(feridas, auditLogs, pacientesService as unknown as PacientesService);
  });

  it('nunca aceita um clinicaId da query diferente do clinicaId do token (cross-tenant)', async () => {
    await expect(
      service.findOne('ferida-1', 'clinica-B-de-outro-usuario', context),
    ).rejects.toThrow(ForbiddenException);
    expect(feridas.findById).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o repositório não encontra a ferida na clínica do usuário (nunca vaza dado de outra clínica)', async () => {
    feridas.findById.mockResolvedValue(null); // repo já filtra por clinicaId — outra clínica nunca aparece aqui
    await expect(service.findOne('ferida-de-outra-clinica', undefined, context)).rejects.toThrow(NotFoundException);
  });

  it('create() sempre grava com o clinicaId do token, nunca o do payload', async () => {
    pacientesService.findOne.mockResolvedValue({ id: 'p1' } as never);
    feridas.create.mockResolvedValue({
      id: 'f1', clinicaId: clinicaDoUsuario, pacienteId: 'p1', rotulo: 'Calcâneo',
      etiologia: Etiologia.PRESSAO, localizacao: 'Calcâneo direito', status: StatusFerida.ATIVA,
      criadoEm: new Date(), atualizadoEm: new Date(),
    });

    await service.create(
      { pacienteId: 'p1', rotulo: 'Calcâneo', etiologia: Etiologia.PRESSAO, localizacao: 'Calcâneo direito' },
      context,
    );

    expect(feridas.create).toHaveBeenCalledWith(expect.objectContaining({ clinicaId: clinicaDoUsuario }));
    expect(auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ event: 'WOUND_CREATED' }));
  });
});
