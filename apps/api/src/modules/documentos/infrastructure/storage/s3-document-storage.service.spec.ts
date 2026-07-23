import { S3DocumentStorageService } from './s3-document-storage.service';
import { AppConfigService } from '../../../../common/security/config.service';
import { Documento, TipoDocumento } from '../../domain/documento.entity';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sharp = require('sharp');

/**
 * Regressão do 500 no confirmar-upload de foto de ferida: com sharp 0.33
 * (`export =`) e sem `esModuleInterop`, `import sharp from 'sharp'` virava
 * `sharp_1.default` (undefined) e a geração do thumbnail lançava
 * "sharp is not a function". O build/CI não pegava porque só type-checa — este
 * caminho só roda de fato ao confirmar um upload. Aqui ele roda.
 */
describe('S3DocumentStorageService.createThumbnailIfSupported', () => {
  const config = {
    getConfig: () => ({
      documentStorageBucket: 'test-bucket',
      documentStorageRegion: 'auto',
      documentStorageEndpoint: 'https://example.r2.cloudflarestorage.com',
      documentStorageForcePathStyle: true,
      documentStorageAccessKeyId: 'k',
      documentStorageSecretAccessKey: 's',
    }),
  } as unknown as AppConfigService;

  function makeService() {
    const service = new S3DocumentStorageService(config);
    const send = jest.fn().mockResolvedValue({});
    // Não bate no R2 real — só nos importa que o thumbnail foi gerado e enviado.
    (service as unknown as { client: { send: jest.Mock } }).client = { send } as never;
    return { service, send };
  }

  function doc(mimeType: Documento['mimeType']): Documento {
    return {
      id: 'd1', clinicaId: 'c1', pacienteId: 'p1',
      nome: 'foto', tipo: TipoDocumento.FOTO_FERIDA, mimeType,
      tamanho: 1, url: `s3://test-bucket/c1/pacientes/p1/foto`,
      hash: 'x', uploadPor: 'u1', criadoEm: new Date(),
    };
  }

  it('gera e envia o thumbnail de um JPEG real (sharp é chamável)', async () => {
    const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 120, b: 90 } } })
      .jpeg().toBuffer();
    const { service, send } = makeService();

    const url = await service.createThumbnailIfSupported(doc('image/jpeg'), jpeg);

    expect(url).toContain('.thumb.jpg');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('ignora formatos sem suporte a thumbnail (webp) sem chamar o storage', async () => {
    const { service, send } = makeService();

    const url = await service.createThumbnailIfSupported(doc('image/webp'), Buffer.alloc(16));

    expect(url).toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});
