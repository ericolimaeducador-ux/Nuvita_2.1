import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AchadoPerilesional, NivelExsudato } from '../../domain/avaliacao-ferida.entity';
import { MedicaoDto } from './medicao.dto';
import { PerfilTecidualDto } from './perfil-tecidual.dto';

/**
 * Sem clinicaId/profissionalId (resolvidos do token), sem recomendacoes/
 * motorClinico (calculados pelo motor de risco na service) — nenhum campo
 * server-derived aceito na entrada.
 */
export class CreateAvaliacaoFeridaDto {
  @ValidateNested()
  @Type(() => MedicaoDto)
  medicao!: MedicaoDto;

  @ValidateNested()
  @Type(() => PerfilTecidualDto)
  tecido!: PerfilTecidualDto;

  @IsEnum(NivelExsudato) exsudato!: NivelExsudato;

  @IsOptional() @IsInt() @Min(0) @Max(10) escalaDor?: number;

  @IsOptional() @IsBoolean() odor?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(AchadoPerilesional, { each: true })
  achadosPerilesionais?: AchadoPerilesional[];

  @IsOptional() @IsBoolean() sinaisSistemicos?: boolean;
  @IsOptional() @IsBoolean() perfusaoRuim?: boolean;
  @IsOptional() @IsBoolean() ossoOuTendaoExposto?: boolean;

  @IsOptional() @IsNumber() @Min(0) pioraAreaPct30Dias?: number;
  @IsOptional() @IsInt() @Min(0) diasCicatrizacaoEstagnada?: number;
}
