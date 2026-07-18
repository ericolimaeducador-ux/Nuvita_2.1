import { AllowedDocumentMimeType } from './documento.entity';

/**
 * Remove metadata embutida em imagens (EXIF/XMP/IPTC/comentários) sem
 * recompressão — fotos de celular carregam GPS, data e serial do aparelho,
 * o que em foto de ferida equivale a vazar o endereço do paciente (LGPD).
 * A remoção é estrutural (descarte de segmentos/chunks), então os pixels
 * ficam byte a byte idênticos — fidelidade clínica preservada.
 *
 * Retorna o buffer sanitizado, ou null quando não há nada a remover ou o
 * formato não é suportado (PDF/DICOM não são tocados; HEIC exige parse de
 * ISO-BMFF com realocação de offsets — fora do escopo, mitigar no cliente).
 *
 * O que fica de propósito: JPEG APP0 (JFIF), APP2 (perfil ICC — cor correta
 * importa na avaliação da lesão) e APP14 (Adobe, necessário pra decodificar);
 * PNG só perde chunks textuais/eXIf/tIME; WebP mantém ICC e alpha.
 */
export function stripImageMetadata(body: Buffer, mimeType: AllowedDocumentMimeType): Buffer | null {
  switch (mimeType) {
    case 'image/jpeg':
      return stripJpeg(body);
    case 'image/png':
      return stripPng(body);
    case 'image/webp':
      return stripWebp(body);
    default:
      return null;
  }
}

// APP1 (EXIF + XMP), APP13 (IPTC/Photoshop) e COM (comentário). APP0/APP2/
// APP14 ficam — ver doc da função pública.
const JPEG_MARKERS_REMOVIDOS = new Set([0xe1, 0xed, 0xfe]);

function stripJpeg(body: Buffer): Buffer | null {
  if (body.length < 4 || body[0] !== 0xff || body[1] !== 0xd8) return null;

  const kept: Buffer[] = [body.subarray(0, 2)];
  let removed = false;
  let offset = 2;

  while (offset + 4 <= body.length) {
    if (body[offset] !== 0xff) return null; // estrutura inesperada — não arriscar
    const marker = body[offset + 1];

    // SOS: daqui em diante é dado entropy-coded até o EOI — copiar verbatim.
    if (marker === 0xda) {
      kept.push(body.subarray(offset));
      return removed ? Buffer.concat(kept) : null;
    }

    const length = body.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > body.length) return null;

    if (JPEG_MARKERS_REMOVIDOS.has(marker)) {
      removed = true;
    } else {
      kept.push(body.subarray(offset, offset + 2 + length));
    }
    offset += 2 + length;
  }

  return null; // nunca achou o SOS — malformado, não mexer
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_CHUNKS_REMOVIDOS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

function stripPng(body: Buffer): Buffer | null {
  if (body.length < 16 || !body.subarray(0, 8).equals(PNG_SIGNATURE)) return null;

  const kept: Buffer[] = [body.subarray(0, 8)];
  let removed = false;
  let offset = 8;

  while (offset + 12 <= body.length) {
    const dataLength = body.readUInt32BE(offset);
    const type = body.subarray(offset + 4, offset + 8).toString('latin1');
    const chunkEnd = offset + 12 + dataLength; // length + type + data + crc
    if (chunkEnd > body.length) return null;

    if (PNG_CHUNKS_REMOVIDOS.has(type)) {
      removed = true;
    } else {
      kept.push(body.subarray(offset, chunkEnd));
    }
    if (type === 'IEND') {
      return removed ? Buffer.concat(kept) : null;
    }
    offset = chunkEnd;
  }

  return null; // sem IEND — malformado, não mexer
}

const WEBP_CHUNKS_REMOVIDOS = new Set(['EXIF', 'XMP ']);
// Flags do VP8X que anunciam os chunks removidos (bit E=0x08, bit X=0x04).
const VP8X_FLAGS_METADATA = 0x08 | 0x04;

function stripWebp(body: Buffer): Buffer | null {
  if (
    body.length < 12 ||
    body.subarray(0, 4).toString('latin1') !== 'RIFF' ||
    body.subarray(8, 12).toString('latin1') !== 'WEBP'
  ) {
    return null;
  }

  const kept: Buffer[] = [];
  let removed = false;
  let offset = 12;

  while (offset + 8 <= body.length) {
    const fourcc = body.subarray(offset, offset + 4).toString('latin1');
    const dataLength = body.readUInt32LE(offset + 4);
    const chunkEnd = offset + 8 + dataLength + (dataLength % 2); // chunks RIFF têm padding par
    if (chunkEnd > body.length) return null;

    if (WEBP_CHUNKS_REMOVIDOS.has(fourcc)) {
      removed = true;
    } else if (fourcc === 'VP8X' && dataLength >= 1) {
      // Limpa os bits de EXIF/XMP do header estendido pra ficar coerente com
      // a remoção dos chunks (decoder estrito rejeita flag sem chunk).
      const chunk = Buffer.from(body.subarray(offset, chunkEnd));
      chunk[8] &= ~VP8X_FLAGS_METADATA;
      kept.push(chunk);
    } else {
      kept.push(body.subarray(offset, chunkEnd));
    }
    offset = chunkEnd;
  }

  if (!removed) return null;

  const payload = Buffer.concat(kept);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(payload.length + 4, 4); // tamanho RIFF = 'WEBP' + chunks
  header.write('WEBP', 8, 'latin1');
  return Buffer.concat([header, payload]);
}
