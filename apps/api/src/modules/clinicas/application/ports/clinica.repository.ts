import { Clinica, ConfiguracoesClinica, EnderecoClinica } from '../../domain/clinica.entity';
import { CreateClinicaDto } from '../dto/create-clinica.dto';

export type CreateClinicaInput = Omit<CreateClinicaDto, 'primeiroAdmin'>;

export interface UpdateClinicaInput {
  nome?: string;
  plano?: Clinica['plano'];
  ativo?: boolean;
  telefone?: string;
  endereco?: EnderecoClinica;
  /** Mesclado com a `configuracoes` existente (nunca substitui o objeto inteiro). */
  configuracoes?: Partial<ConfiguracoesClinica>;
}

export interface ClinicaRepository {
  create(input: CreateClinicaInput): Promise<Clinica>;
  findById(id: string): Promise<Clinica | null>;
  findByCnpj(cnpj: string): Promise<Clinica | null>;
  findAll(): Promise<Clinica[]>;
  update(id: string, input: UpdateClinicaInput): Promise<Clinica | null>;
}
