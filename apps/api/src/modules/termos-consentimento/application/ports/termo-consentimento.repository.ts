import { AssinaturaTermo, TermoConsentimento } from '../../domain/termo-consentimento.entity';

export interface TermoConsentimentoRepository {
  create(data: Omit<TermoConsentimento, 'id' | 'criadoEm' | 'assinatura'>): Promise<TermoConsentimento>;
  findById(clinicaId: string, id: string): Promise<TermoConsentimento | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<TermoConsentimento[]>;
  /** Retorna `null` se o termo não existir OU já estiver assinado (assinatura nunca é sobrescrita). */
  sign(clinicaId: string, id: string, assinatura: AssinaturaTermo): Promise<TermoConsentimento | null>;
}
