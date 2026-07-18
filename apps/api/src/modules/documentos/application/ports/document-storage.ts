import { Documento } from '../../domain/documento.entity';

export interface PresignedUploadInput {
  key: string;
  mimeType: string;
  tamanho: number;
  hash: string;
}

export interface PresignedUploadOutput {
  uploadUrl: string;
  privateUrl: string;
  expiresInSeconds: number;
}

export interface DocumentStorage {
  createUploadUrl(input: PresignedUploadInput): Promise<PresignedUploadOutput>;
  createReadUrl(privateUrl: string, expiresInSeconds: number): Promise<string>;
  /** Baixa o objeto para verificação de integridade no confirm. null se não existir no storage. */
  fetchObject(privateUrl: string): Promise<Buffer | null>;
  /** Regrava o objeto no mesmo key (ex.: corpo sanitizado sem EXIF no confirm). */
  overwriteObject(privateUrl: string, body: Buffer, mimeType: string): Promise<void>;
  /** Gera thumbnail a partir do corpo já baixado (evita segundo download no confirm). */
  createThumbnailIfSupported(documento: Documento, body: Buffer): Promise<string | undefined>;
  /** Remove o objeto (e seu thumbnail, se houver) do storage. Best-effort. */
  deleteObject(privateUrl: string): Promise<void>;
}
