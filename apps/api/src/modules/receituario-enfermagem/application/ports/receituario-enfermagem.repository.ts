import { ReceituarioEnfermagem } from '../../domain/receituario-enfermagem.entity';

export interface ReceituarioEnfermagemRepository {
  create(data: Omit<ReceituarioEnfermagem, 'id' | 'criadoEm'>): Promise<ReceituarioEnfermagem>;
  findById(clinicaId: string, id: string): Promise<ReceituarioEnfermagem | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<ReceituarioEnfermagem[]>;
}
