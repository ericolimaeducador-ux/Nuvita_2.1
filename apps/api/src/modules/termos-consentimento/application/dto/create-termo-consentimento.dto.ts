import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoTermo } from '../../domain/termo-consentimento.entity';

export class CreateTermoConsentimentoDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsString()
  pacienteId!: string;

  @IsEnum(TipoTermo)
  tipo!: TipoTermo;
}
