import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoProduto } from '../../domain/produto.entity';

export class CreateProdutoDto {
  @IsString()
  @MaxLength(160)
  nome!: string;

  @IsEnum(TipoProduto)
  tipo!: TipoProduto;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoVenda!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  custo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  apresentacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fabricante?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}

export class UpdateProdutoDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nome?: string;

  @IsOptional()
  @IsEnum(TipoProduto)
  tipo?: TipoProduto;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoVenda?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  custo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  apresentacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fabricante?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class ListProdutosQueryDto {
  @IsOptional()
  @IsEnum(TipoProduto)
  tipo?: TipoProduto;

  @IsOptional()
  @IsString()
  clinicaId?: string;
}
