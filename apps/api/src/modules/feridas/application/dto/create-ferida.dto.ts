import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Etiologia, StatusFerida } from '../../domain/ferida.entity';

export class CreateFeridaDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() rotulo!: string;
  @IsEnum(Etiologia) etiologia!: Etiologia;
  @IsString() localizacao!: string;
  @IsOptional() @IsEnum(StatusFerida) status?: StatusFerida;
  @IsOptional() @IsDateString() dataInicio?: string;
  @IsOptional() @IsString() observacoes?: string;
}
