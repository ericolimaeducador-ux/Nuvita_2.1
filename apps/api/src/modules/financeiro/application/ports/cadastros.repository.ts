import { Instituicao } from '../../domain/instituicao.entity';
import { Recorrencia } from '../../domain/recorrencia.entity';
import { Servico } from '../../domain/servico.entity';

export type CreateServicoInput = Omit<Servico, 'id' | 'criadoEm' | 'atualizadoEm'>;
export type UpdateServicoInput = Partial<Omit<Servico, 'id' | 'clinicaId' | 'criadoEm' | 'atualizadoEm'>>;

export interface ServicoRepository {
  findById(clinicaId: string, id: string): Promise<Servico | null>;
  findAll(clinicaId: string, apenasAtivos?: boolean): Promise<Servico[]>;
  create(input: CreateServicoInput): Promise<Servico>;
  update(clinicaId: string, id: string, input: UpdateServicoInput): Promise<Servico | null>;
}

export type CreateInstituicaoInput = Omit<Instituicao, 'id' | 'criadoEm' | 'atualizadoEm'>;
export type UpdateInstituicaoInput = Partial<Omit<Instituicao, 'id' | 'clinicaId' | 'criadoEm' | 'atualizadoEm'>>;

export interface InstituicaoRepository {
  findById(clinicaId: string, id: string): Promise<Instituicao | null>;
  findAll(clinicaId: string, apenasAtivos?: boolean): Promise<Instituicao[]>;
  create(input: CreateInstituicaoInput): Promise<Instituicao>;
  update(clinicaId: string, id: string, input: UpdateInstituicaoInput): Promise<Instituicao | null>;
}

export type CreateRecorrenciaInput = Omit<Recorrencia, 'id' | 'criadoEm' | 'atualizadoEm'>;
export type UpdateRecorrenciaInput = Partial<Omit<Recorrencia, 'id' | 'clinicaId' | 'criadoEm' | 'atualizadoEm'>>;

export interface RecorrenciaRepository {
  findById(clinicaId: string, id: string): Promise<Recorrencia | null>;
  findAll(clinicaId: string, apenasAtivas?: boolean): Promise<Recorrencia[]>;
  create(input: CreateRecorrenciaInput): Promise<Recorrencia>;
  update(clinicaId: string, id: string, input: UpdateRecorrenciaInput): Promise<Recorrencia | null>;
}
