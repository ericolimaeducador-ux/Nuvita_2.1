import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CategoriaLancamento, TipoLancamento } from '../../domain/lancamento.entity';
import { TipoInstituicao } from '../../domain/instituicao.entity';
import { TipoServico } from '../../domain/servico.entity';

// ---------- Tabela de precos ----------

export class CreateServicoDto {
  @IsOptional() @IsString() clinicaId?: string;

  @IsString() @MinLength(2) @MaxLength(120) nome!: string;

  @IsEnum(TipoServico) tipo!: TipoServico;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) preco!: number;

  @IsOptional() @IsString() @MaxLength(300) descricao?: string;
}

export class UpdateServicoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) nome?: string;
  @IsOptional() @IsEnum(TipoServico) tipo?: TipoServico;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) preco?: number;
  @IsOptional() @IsString() @MaxLength(300) descricao?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

// ---------- Cliente institucional ----------

export class CreateInstituicaoDto {
  @IsOptional() @IsString() clinicaId?: string;

  @IsString() @MinLength(2) @MaxLength(160) nome!: string;

  @IsEnum(TipoInstituicao) tipo!: TipoInstituicao;

  /** Aceita com ou sem mascara; normalizado para digitos na service. */
  @IsOptional() @IsString() @MaxLength(20) cnpj?: string;

  @IsOptional() @IsString() @MaxLength(120) contatoNome?: string;
  @IsOptional() @IsString() @MaxLength(160) contatoEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contatoTelefone?: string;
  @IsOptional() @IsString() @MaxLength(500) observacoes?: string;
}

export class UpdateInstituicaoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) nome?: string;
  @IsOptional() @IsEnum(TipoInstituicao) tipo?: TipoInstituicao;
  @IsOptional() @IsString() @MaxLength(20) cnpj?: string;
  @IsOptional() @IsString() @MaxLength(120) contatoNome?: string;
  @IsOptional() @IsString() @MaxLength(160) contatoEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contatoTelefone?: string;
  @IsOptional() @IsString() @MaxLength(500) observacoes?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

// ---------- Recorrencia (contrato de consultoria / aluguel / conta fixa) ----------

export class CreateRecorrenciaDto {
  @IsOptional() @IsString() clinicaId?: string;

  @IsString() @MinLength(3) @MaxLength(160) descricao!: string;

  @IsEnum(TipoLancamento) tipo!: TipoLancamento;

  @IsEnum(CategoriaLancamento) categoria!: CategoriaLancamento;

  @IsOptional() @IsString() instituicaoId?: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) valorMensal!: number;

  /** Limitado a 28 para existir em todo mes, inclusive fevereiro. */
  @IsInt() @Min(1) @Max(28) @Type(() => Number) diaVencimento!: number;

  @IsDateString() inicio!: string;

  @IsOptional() @IsDateString() fim?: string;
}

export class UpdateRecorrenciaDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) descricao?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) valorMensal?: number;
  @IsOptional() @IsInt() @Min(1) @Max(28) @Type(() => Number) diaVencimento?: number;
  @IsOptional() @IsDateString() fim?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

// ---------- Relatorio ----------

export class RelatorioQueryDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsOptional() @IsDateString() dataInicio?: string;
  @IsOptional() @IsDateString() dataFim?: string;
  @IsOptional() @IsEnum(CategoriaLancamento) categoria?: CategoriaLancamento;
  @IsOptional() @IsString() instituicaoId?: string;
}

export class ListCadastroQueryDto {
  @IsOptional() @IsString() clinicaId?: string;

  /** `true` inclui itens inativos (tela de configuracao). */
  @IsOptional()
  @Matches(/^(true|false)$/)
  incluirInativos?: string;
}
