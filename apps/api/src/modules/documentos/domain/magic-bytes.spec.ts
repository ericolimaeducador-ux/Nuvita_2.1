import { magicBytesMatch } from './magic-bytes';

function bufferFrom(bytes: number[], padTo = 0): Buffer {
  const buf = Buffer.alloc(Math.max(bytes.length, padTo));
  Buffer.from(bytes).copy(buf);
  return buf;
}

describe('magicBytesMatch', () => {
  it('aceita PDF real e rejeita outro conteúdo como PDF', () => {
    expect(magicBytesMatch(Buffer.from('%PDF-1.7\n...'), 'application/pdf')).toBe(true);
    expect(magicBytesMatch(Buffer.from('MZ\x90\x00executavel'), 'application/pdf')).toBe(false);
  });

  it('aceita JPEG real e rejeita PNG declarado como JPEG', () => {
    expect(magicBytesMatch(bufferFrom([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(true);
    expect(magicBytesMatch(bufferFrom([0x89, 0x50, 0x4e, 0x47]), 'image/jpeg')).toBe(false);
  });

  it('aceita PNG real', () => {
    expect(magicBytesMatch(bufferFrom([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true);
  });

  it('aceita WEBP real (RIFF....WEBP) e rejeita RIFF de outro formato (ex.: WAV)', () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);
    const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')]);
    expect(magicBytesMatch(webp, 'image/webp')).toBe(true);
    expect(magicBytesMatch(wav, 'image/webp')).toBe(false);
  });

  it('aceita HEIC real (ftyp + brand heic/mif1) e rejeita MP4 comum', () => {
    const heic = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic')]);
    const mif1 = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypmif1')]);
    const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypisom')]);
    expect(magicBytesMatch(heic, 'image/heic')).toBe(true);
    expect(magicBytesMatch(mif1, 'image/heic')).toBe(true);
    expect(magicBytesMatch(mp4, 'image/heic')).toBe(false);
  });

  it('aceita DICOM real (DICM no offset 128) e rejeita arquivo curto', () => {
    const dicom = Buffer.alloc(132);
    dicom.write('DICM', 128, 'latin1');
    expect(magicBytesMatch(dicom, 'application/dicom')).toBe(true);
    expect(magicBytesMatch(Buffer.from('DICM'), 'application/dicom')).toBe(false);
  });

  it('um executável nunca passa em nenhum MIME permitido', () => {
    const exe = bufferFrom([0x4d, 0x5a, 0x90, 0x00], 200); // MZ header (PE/EXE)
    for (const mime of ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/dicom'] as const) {
      expect(magicBytesMatch(exe, mime)).toBe(false);
    }
  });
});
