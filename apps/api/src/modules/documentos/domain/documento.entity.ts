export enum TipoDocumento {
  EXAME = 'exame',
  RECEITA = 'receita',
  LAUDO = 'laudo',
  TERMO = 'termo',
  FOTO_FERIDA = 'foto_ferida',
  OUTRO = 'outro',
}

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/dicom',
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export interface Documento {
  id: string;
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
  thumbnailUrl?: string;
  criadoEm: Date;
  excluidoEm?: Date;
  excluidoPor?: string;
}
