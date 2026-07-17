import { Ferida } from '../../domain/ferida.entity';

export interface FeridaRepository {
  create(data: Omit<Ferida, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Ferida>;
  update(clinicaId: string, id: string, data: Partial<Pick<Ferida, 'rotulo' | 'status' | 'observacoes'>>): Promise<Ferida | null>;
  findById(clinicaId: string, id: string): Promise<Ferida | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<Ferida[]>;
  softDelete(clinicaId: string, id: string, excluidoPor: string): Promise<Ferida | null>;
}
