import { IsBase64, IsIn, IsString, MaxLength } from 'class-validator';

/** ~5 MB de imagem em base64 (base64 infla o binário em ~33%). */
const MAX_BASE64 = 7_000_000;

export class AnalisarFotoDto {
  @IsString()
  @IsBase64(undefined, { message: 'imagemBase64 deve ser base64 puro, sem prefixo data:' })
  @MaxLength(MAX_BASE64, { message: 'Imagem muito grande (máx. ~5 MB). Reduza a resolução.' })
  imagemBase64!: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mediaType!: 'image/jpeg' | 'image/png' | 'image/webp';
}
