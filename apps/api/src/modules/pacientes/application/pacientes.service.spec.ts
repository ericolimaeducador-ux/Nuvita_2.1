import { BadRequestException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { ClinicasService } from '../../clinicas/application/clinicas.service';
import { PlanoClinica } from '../../clinicas/domain/clinica.entity';
import { PacienteRepository } from './ports/paciente.repository';
import { PacientesService } from './pacientes.service';

/** LIMITES_POR_PLANO.maxPacientes precisa ser respeitado — sem isso o limite fica só decorativo. */
describe('PacientesService — limite de pacientes do plano', () => {
  const user: AuthTokenPayload = {
    sub: 'u1', email: 'sec@clinica.com', papel: Papel.SECRETARIA, clinicaId: 'clinica-A',
    jti: 'jti-1', typ: 'access',
  };
  const context = { ip: '127.0.0.1', userAgent: 'jest', user };

  let pacientes: jest.Mocked<Pick<PacienteRepository, 'create' | 'count'>>;
  let auditLogs: jest.Mocked<AuditLogRepository>;
  let clinicasService: jest.Mocked<Pick<ClinicasService, 'findById'>>;
  let service: PacientesService;

  const clinicaBasico = {
    id: 'clinica-A', nome: 'Clínica X', cnpj: '00000000000000', plano: PlanoClinica.BASICO,
    configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 30 }, ativo: true, criadoEm: new Date(),
  };

  beforeEach(() => {
    pacientes = { create: jest.fn(), count: jest.fn() };
    auditLogs = { create: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;
    clinicasService = { findById: jest.fn().mockResolvedValue(clinicaBasico) };

    service = new PacientesService(
      pacientes as unknown as PacienteRepository,
      auditLogs,
      clinicasService as unknown as ClinicasService,
    );
  });

  it('bloqueia o cadastro quando a clínica já atingiu o limite de pacientes do plano (BASICO = 500)', async () => {
    pacientes.count.mockResolvedValue(500);
    await expect(service.create({ nome: 'Novo paciente' } as never, context)).rejects.toThrow(BadRequestException);
    expect(pacientes.create).not.toHaveBeenCalled();
  });

  it('permite o cadastro quando a clínica está abaixo do limite do plano', async () => {
    pacientes.count.mockResolvedValue(499);
    pacientes.create.mockResolvedValue({ id: 'p1' } as never);
    await service.create({ nome: 'Novo paciente' } as never, context);
    expect(pacientes.create).toHaveBeenCalled();
  });
});
