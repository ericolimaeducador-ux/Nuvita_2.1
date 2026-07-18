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
import { BordasFerida, SinalInfeccaoResvech, TecidosAfetados } from '../../domain/escalas';
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

  // Itens 2/3/6 do RESVECH 2.0 — o score só é calculado quando bordas e
  // tecidosAfetados vierem juntos (validado na service).
  @IsOptional() @IsEnum(BordasFerida) bordas?: BordasFerida;
  @IsOptional() @IsEnum(TecidosAfetados) tecidosAfetados?: TecidosAfetados;

  @IsOptional()
  @IsArray()
  @IsEnum(SinalInfeccaoResvech, { each: true })
  sinaisInfeccao?: SinalInfeccaoResvech[];
}
