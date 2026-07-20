import { CursorPaginationInput, CursorPaginationResult } from '../../domain/pagination';
import { Paciente } from '../../domain/paciente.entity';

export type CreatePacienteInput = Omit<Paciente, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>;

export type UpdatePacienteInput = Partial<
  Omit<Paciente, 'id' | 'clinicaId' | 'ativo' | 'criadoEm' | 'atualizadoEm'>
>;

export const PACIENTE_SORTS = [
  'recentes',
  'nome_asc',
  'nome_desc',
  'nascimento_asc',
  'nascimento_desc',
] as const;

export type PacienteSort = (typeof PACIENTE_SORTS)[number];

export interface ListPacientesInput extends CursorPaginationInput {
  clinicaId: string;
  incluirInativos?: boolean;
  /** Dia exato de nascimento no formato YYYY-MM-DD. */
  dataNascimento?: string;
  sort?: PacienteSort;
}

export interface SearchPacientesByNameInput extends ListPacientesInput {
  nome: string;
}

export interface PacienteRepository {
  create(input: CreatePacienteInput): Promise<Paciente>;
  list(input: ListPacientesInput): Promise<CursorPaginationResult<Paciente>>;
  searchByName(input: SearchPacientesByNameInput): Promise<CursorPaginationResult<Paciente>>;
  findByCpf(clinicaId: string, cpf: string, incluirInativos?: boolean): Promise<Paciente | null>;
  findById(clinicaId: string, pacienteId: string, incluirInativos?: boolean): Promise<Paciente | null>;
  /** Busca vários pacientes por id (inclui inativos) — usado p/ resolver nome/CPF em lote. */
  findManyByIds(clinicaId: string, pacienteIds: string[]): Promise<Paciente[]>;
  update(clinicaId: string, pacienteId: string, input: UpdatePacienteInput): Promise<Paciente | null>;
  deactivate(clinicaId: string, pacienteId: string): Promise<Paciente | null>;
  /** Total de pacientes ativos da clínica — usado para checar o limite do plano (LIMITES_POR_PLANO). */
  count(clinicaId: string): Promise<number>;
}
