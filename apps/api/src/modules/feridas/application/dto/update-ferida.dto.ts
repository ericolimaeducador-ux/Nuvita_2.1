import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusFerida } from '../../domain/ferida.entity';

export class UpdateFeridaDto {
  @IsOptional() @IsString() rotulo?: string;
  @IsOptional() @IsEnum(StatusFerida) status?: StatusFerida;
  @IsOptional() @IsString() observacoes?: string;
}
