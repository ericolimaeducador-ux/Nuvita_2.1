import { AvaliacaoFerida } from '../../domain/avaliacao-ferida.entity';

/**
 * Sem update/delete — imutabilidade garantida na própria interface, não só
 * na ausência de rota no controller (defesa em profundidade, mesmo padrão
 * do prontuário assinado).
 */
export interface AvaliacaoFeridaRepository {
  create(data: Omit<AvaliacaoFerida, 'id' | 'criadoEm'>): Promise<AvaliacaoFerida>;
  findById(clinicaId: string, id: string): Promise<AvaliacaoFerida | null>;
  listByFerida(clinicaId: string, feridaId: string): Promise<AvaliacaoFerida[]>;
}
