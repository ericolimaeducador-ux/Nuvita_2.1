import { AllowedDocumentMimeType } from './documento.entity';

/**
 * Confere se os primeiros bytes do arquivo batem com a assinatura do MIME
 * declarado — o Content-Type do upload é controlado pelo cliente, então a
 * única prova real do formato é o próprio conteúdo. DICOM exige 132 bytes
 * (preâmbulo de 128 + "DICM"); os demais formatos se resolvem nos 16 primeiros.
 */
export function magicBytesMatch(body: Buffer, mimeType: AllowedDocumentMimeType): boolean {
  switch (mimeType) {
    case 'application/pdf':
      return body.subarray(0, 4).toString('latin1') === '%PDF';
    case 'image/jpeg':
      return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
    case 'image/png':
      return body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return body.subarray(0, 4).toString('latin1') === 'RIFF' && body.subarray(8, 12).toString('latin1') === 'WEBP';
    case 'image/heic': {
      if (body.subarray(4, 8).toString('latin1') !== 'ftyp') return false;
      const brand = body.subarray(8, 12).toString('latin1');
      return ['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand);
    }
    case 'application/dicom':
      return body.subarray(128, 132).toString('latin1') === 'DICM';
    default:
      return false;
  }
}
