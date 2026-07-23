import { EvolucaoPlano, PlanoCuidados } from '../../domain/plano-cuidados.entity';

export interface PlanoCuidadosRepository {
  create(data: Omit<PlanoCuidados, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<PlanoCuidados>;

  findById(clinicaId: string, id: string): Promise<PlanoCuidados | null>;

  listByPaciente(clinicaId: string, pacienteId: string): Promise<PlanoCuidados[]>;

  /**
   * Acrescenta uma evolução ao plano. É `$push` por desenho — evolução já
   * gravada não se reescreve.
   */
  appendEvolucao(
    clinicaId: string,
    id: string,
    evolucao: EvolucaoPlano,
  ): Promise<PlanoCuidados | null>;
}
