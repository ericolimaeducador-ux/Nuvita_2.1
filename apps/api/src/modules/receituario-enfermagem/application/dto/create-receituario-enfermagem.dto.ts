import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

export class ItemReceituarioDto {
  @IsOptional()
  @IsString()
  produtoId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nome!: string;

  @IsInt()
  @Min(1)
  quantidade!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  instrucoesUso!: string;
}

export class CreateReceituarioEnfermagemDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsString()
  pacienteId!: string;

  @IsOptional()
  @IsString()
  feridaId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemReceituarioDto)
  itens!: ItemReceituarioDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
