import { stripImageMetadata } from './strip-metadata';

/** Segmento JPEG com marker + length big-endian + payload. */
function jpegSegment(marker: number, payload: Buffer): Buffer {
  const header = Buffer.from([0xff, marker, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

/** JPEG mínimo estruturalmente válido: SOI + segmentos + SOS + entropy + EOI. */
function jpegWith(segments: Buffer[]): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    ...segments,
    jpegSegment(0xda, Buffer.from([0x01, 0x00])), // SOS
    Buffer.from([0x12, 0x34, 0x56]), // entropy-coded fake
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
}

const APP0_JFIF = jpegSegment(0xe0, Buffer.from('JFIF\0'));
const APP1_EXIF_GPS = jpegSegment(0xe1, Buffer.from('Exif\0\0GPS-latitude-fake'));
const APP2_ICC = jpegSegment(0xe2, Buffer.from('ICC_PROFILE\0'));
const APP13_IPTC = jpegSegment(0xed, Buffer.from('Photoshop 3.0\0'));
const COM = jpegSegment(0xfe, Buffer.from('comentario'));
const DQT = jpegSegment(0xdb, Buffer.alloc(65));

/** Chunk PNG com length + type + data + crc (crc fake — o strip não valida). */
function pngChunk(type: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 'latin1');
  return Buffer.concat([header, data, Buffer.alloc(4)]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngWith(chunks: Buffer[]): Buffer {
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', Buffer.alloc(13)),
    ...chunks,
    pngChunk('IDAT', Buffer.from([1, 2, 3])),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Chunk RIFF/WebP com fourcc + length little-endian + data (+ padding par). */
function webpChunk(fourcc: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.write(fourcc, 0, 'latin1');
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}

function webpWith(chunks: Buffer[]): Buffer {
  const payload = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(payload.length + 4, 4);
  header.write('WEBP', 8, 'latin1');
  return Buffer.concat([header, payload]);
}

describe('stripImageMetadata', () => {
  describe('JPEG', () => {
    it('remove APP1 (EXIF/GPS), APP13 (IPTC) e COM, preservando JFIF/ICC/tabelas e o stream de imagem', () => {
      const original = jpegWith([APP0_JFIF, APP1_EXIF_GPS, APP2_ICC, APP13_IPTC, COM, DQT]);
      const result = stripImageMetadata(original, 'image/jpeg');

      expect(result).not.toBeNull();
      expect(result!.equals(jpegWith([APP0_JFIF, APP2_ICC, DQT]))).toBe(true);
      expect(result!.includes(Buffer.from('GPS-latitude-fake'))).toBe(false);
      expect(result!.includes(Buffer.from('ICC_PROFILE'))).toBe(true);
    });

    it('é idempotente: imagem já limpa retorna null (nada a regravar)', () => {
      const limpo = jpegWith([APP0_JFIF, DQT]);
      expect(stripImageMetadata(limpo, 'image/jpeg')).toBeNull();
    });

    it('não mexe em JPEG malformado (length estourando o buffer)', () => {
      const malformado = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe1, 0xff, 0xff, 0x00])]);
      expect(stripImageMetadata(malformado, 'image/jpeg')).toBeNull();
    });
  });

  describe('PNG', () => {
    it('remove tEXt/zTXt/iTXt/eXIf/tIME e mantém IHDR/IDAT/IEND', () => {
      const original = pngWith([
        pngChunk('tEXt', Buffer.from('Author\0Fulano')),
        pngChunk('eXIf', Buffer.from('MM\0*gps-fake')),
        pngChunk('iTXt', Buffer.from('XML:com.adobe.xmp\0...')),
        pngChunk('tIME', Buffer.alloc(7)),
      ]);
      const result = stripImageMetadata(original, 'image/png');

      expect(result).not.toBeNull();
      expect(result!.equals(pngWith([]))).toBe(true);
      expect(result!.includes(Buffer.from('gps-fake'))).toBe(false);
    });

    it('é idempotente: PNG sem chunks de metadata retorna null', () => {
      expect(stripImageMetadata(pngWith([]), 'image/png')).toBeNull();
    });

    it('não mexe em PNG sem IEND (truncado)', () => {
      const truncado = Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', Buffer.alloc(13))]);
      expect(stripImageMetadata(truncado, 'image/png')).toBeNull();
    });
  });

  describe('WebP', () => {
    it('remove chunks EXIF/XMP, limpa os bits E/X do VP8X e recalcula o tamanho RIFF', () => {
      const vp8xComFlags = webpChunk('VP8X', Buffer.from([0x08 | 0x04 | 0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
      const original = webpWith([
        vp8xComFlags,
        webpChunk('VP8 ', Buffer.from([1, 2, 3, 4])),
        webpChunk('EXIF', Buffer.from('gps-fake')),
        webpChunk('XMP ', Buffer.from('<xmp/>')),
      ]);
      const result = stripImageMetadata(original, 'image/webp');

      const vp8xLimpo = webpChunk('VP8X', Buffer.from([0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
      expect(result).not.toBeNull();
      expect(result!.equals(webpWith([vp8xLimpo, webpChunk('VP8 ', Buffer.from([1, 2, 3, 4]))]))).toBe(true);
      expect(result!.includes(Buffer.from('gps-fake'))).toBe(false);
    });

    it('é idempotente: WebP simples sem metadata retorna null', () => {
      expect(stripImageMetadata(webpWith([webpChunk('VP8 ', Buffer.from([1, 2, 3, 4]))]), 'image/webp')).toBeNull();
    });
  });

  it('não toca formatos fora do escopo (PDF, DICOM, HEIC)', () => {
    expect(stripImageMetadata(Buffer.from('%PDF-1.7'), 'application/pdf')).toBeNull();
    const dicom = Buffer.alloc(132);
    dicom.write('DICM', 128, 'latin1');
    expect(stripImageMetadata(dicom, 'application/dicom')).toBeNull();
    expect(stripImageMetadata(Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic')]), 'image/heic')).toBeNull();
  });
});
