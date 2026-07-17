import { ForbiddenException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AppConfigService } from '../../../common/security/config.service';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { PlanoClinica } from '../domain/clinica.entity';
import { ClinicaRepository } from './ports/clinica.repository';
import { ClinicasService } from './clinicas.service';

/** LIMITES_POR_PLANO.maxUsuarios precisa ser respeitado — sem isso o limite fica só decorativo. */
describe('ClinicasService — limite de usuários do plano', () => {
  const adminUser: AuthTokenPayload = {
    sub: 'admin-1', email: 'admin@clinica.com', papel: Papel.ADMIN, clinicaId: 'clinica-A',
    jti: 'jti-1', typ: 'access',
  };
  const context = { ip: '127.0.0.1', userAgent: 'jest', user: adminUser };

  let clinicas: jest.Mocked<Pick<ClinicaRepository, 'findById'>>;
  let users: jest.Mocked<Pick<UserRepository, 'findByEmail' | 'create' | 'count'>>;
  let auditLogs: jest.Mocked<AuditLogRepository>;
  let service: ClinicasService;

  const clinicaBasico = {
    id: 'clinica-A', nome: 'Clínica X', cnpj: '00000000000000', plano: PlanoClinica.BASICO,
    configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 30 }, ativo: true, criadoEm: new Date(),
  };

  beforeEach(() => {
    clinicas = { findById: jest.fn().mockResolvedValue(clinicaBasico) };
    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'novo-user', email: 'novo@clinica.com', papel: Papel.ENFERMEIRO }),
      count: jest.fn(),
    };
    auditLogs = { create: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;

    const configService = {
      getConfig: () => ({ bcryptRounds: 4 }),
    } as unknown as AppConfigService;

    service = new ClinicasService(
      clinicas as unknown as ClinicaRepository,
      users as unknown as UserRepository,
      auditLogs,
      configService,
    );
  });

  const novoUsuarioDto = { nome: 'Enfermeira Ana', email: 'nova@clinica.com', password: 'senhaForte123', papel: Papel.ENFERMEIRO };

  it('bloqueia a criação de usuário quando a clínica já atingiu o limite do plano (BASICO = 5)', async () => {
    users.count.mockResolvedValue(5);
    await expect(
      service.createUsuario('clinica-A', novoUsuarioDto as never, context),
    ).rejects.toThrow(ForbiddenException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('permite a criação de usuário quando a clínica está abaixo do limite do plano', async () => {
    users.count.mockResolvedValue(4);
    await service.createUsuario('clinica-A', novoUsuarioDto as never, context);
    expect(users.create).toHaveBeenCalled();
  });

  it('conta apenas usuários ativos da própria clínica ao checar o limite', async () => {
    users.count.mockResolvedValue(0);
    await service.createUsuario('clinica-A', novoUsuarioDto as never, context);
    expect(users.count).toHaveBeenCalledWith({ clinicaId: 'clinica-A', ativo: true });
  });
});
