import { AllowedDocumentMimeType, Documento, TipoDocumento } from '../../domain/documento.entity';

export interface CreateDocumentoInput {
  clinicaId: string;
  pacienteId: string;
  prontuarioId?: string;
  feridaId?: string;
  avaliacaoFeridaId?: string;
  nome: string;
  tipo: TipoDocumento;
  mimeType: AllowedDocumentMimeType;
  tamanho: number;
  url: string;
  hash: string;
  uploadPor: string;
}

export interface ListDocumentoInput {
  clinicaId: string;
  pacienteId?: string;
  prontuarioId?: string;
  feridaId?: string;
  avaliacaoFeridaId?: string;
}

export interface DocumentoRepository {
  create(input: CreateDocumentoInput): Promise<Documento>;
  findById(clinicaId: string, documentoId: string, incluirExcluidos?: boolean): Promise<Documento | null>;
  list(input: ListDocumentoInput): Promise<Documento[]>;
  sumActivePatientBytes(clinicaId: string, pacienteId: string): Promise<number>;
  setThumbnail(clinicaId: string, documentoId: string, thumbnailUrl: string): Promise<void>;
  /** Atualiza tamanho/hash após sanitização de metadata no confirm (o objeto no storage mudou). */
  setConteudoSanitizado(clinicaId: string, documentoId: string, tamanho: number, hash: string): Promise<void>;
  softDelete(clinicaId: string, documentoId: string, excluidoPor: string): Promise<Documento | null>;
}
