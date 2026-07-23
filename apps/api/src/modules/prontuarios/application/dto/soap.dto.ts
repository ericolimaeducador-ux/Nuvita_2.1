import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubjetivoDto {
  @IsString()
  queixaPrincipal!: string;

  @IsOptional()
  @IsString()
  hda?: string;

  @IsOptional()
  @IsString()
  antecedentesPessoais?: string;

  @IsOptional()
  @IsString()
  antecedentesCirurgicos?: string;

  @IsOptional()
  @IsString()
  medicamentosEmUso?: string;

  @IsOptional()
  @IsString()
  alergias?: string;

  @IsOptional()
  @IsString()
  historiaFamiliar?: string;

  @IsOptional()
  @IsString()
  historiaSocial?: string;

  @IsOptional()
  @IsString()
  revisaoSistemas?: string;
}

export class SinaisVitaisDto {
  @IsOptional()
  @IsString()
  pressaoArterial?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  frequenciaCardiaca?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  frequenciaRespiratoria?: number;

  @IsOptional()
  @IsNumber()
  temperatura?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  saturacaoO2?: number;

  @IsOptional()
  @IsNumber()
  peso?: number;

  @IsOptional()
  @IsNumber()
  altura?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  escalaDor?: number;
}

export class ExameSegmentarDto {
  @IsOptional() @IsString() cabecaPescoco?: string;
  @IsOptional() @IsString() cardiovascular?: string;
  @IsOptional() @IsString() respiratorio?: string;
  @IsOptional() @IsString() abdome?: string;
  @IsOptional() @IsString() geniturinario?: string;
  @IsOptional() @IsString() neurologico?: string;
  @IsOptional() @IsString() extremidades?: string;
  @IsOptional() @IsString() pele?: string;
}

export class ObjetivoDto {
  @IsOptional()
  @IsString()
  estadoGeral?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SinaisVitaisDto)
  sinaisVitais?: SinaisVitaisDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExameSegmentarDto)
  exameSegmentar?: ExameSegmentarDto;

  @IsOptional()
  @IsString()
  exameFisico?: string;
}

export class AvaliacaoDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hipotesesDiagnosticas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cid10?: string[];

  @IsOptional()
  @IsString()
  diagnosticoDefinitivo?: string;

  @IsOptional()
  @IsString()
  evolucao?: string;
}

export class PlanoDto {
  @IsOptional()
  @IsString()
  conduta?: string;

  @IsOptional()
  @IsString()
  prescricao?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examesSolicitados?: string[];

  @IsOptional()
  @IsString()
  orientacoes?: string;

  @IsOptional()
  @IsString()
  encaminhamentos?: string;

  @IsOptional()
  @IsString()
  retorno?: string;
}

export class ArquivoProntuarioDto {
  @IsString()
  nome!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsString()
  tipo!: string;

  @IsInt()
  @Min(0)
  tamanho!: number;
}

export class ArquivosProntuarioDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ArquivoProntuarioDto)
  arquivos?: ArquivoProntuarioDto[];
}

/**
 * Subescalas da escala de Braden, como o enfermeiro as seleciona na tela.
 *
 * O DTO aceita apenas as seis escolhas — o total e a classificação de risco são
 * calculados no servidor (`domain/braden.ts`) e nunca aceitos do cliente, mesmo
 * racional das escalas de ferida.
 */
export class BradenSubescalasDto {
  @IsInt() @Min(1) @Max(4) percepcaoSensorial!: number;
  @IsInt() @Min(1) @Max(4) umidade!: number;
  @IsInt() @Min(1) @Max(4) atividade!: number;
  @IsInt() @Min(1) @Max(4) mobilidade!: number;
  @IsInt() @Min(1) @Max(4) nutricao!: number;
  /** Única subescala de 3 níveis. */
  @IsInt() @Min(1) @Max(3) friccaoCisalhamento!: number;
}

/** Registro da consulta de enfermagem em estomaterapia (complementa a AvaliacaoFerida). */
export class RegistroEnfermagemDto {
  @IsOptional() @IsString() motivoAtendimento?: string;
  @IsOptional() @IsString() comorbidadesRelevantes?: string;
  @IsOptional() @IsString() mobilidade?: string;

  /** Seleções da escala; o servidor deriva `escoreBraden` a partir daqui. */
  @IsOptional()
  @ValidateNested()
  @Type(() => BradenSubescalasDto)
  braden?: BradenSubescalasDto;

  /**
   * Escore de Braden 6-23. Continua aceito para registros antigos e para
   * digitação direta, mas quando `braden` vem preenchido o valor calculado
   * pelo servidor prevalece.
   */
  @IsOptional() @IsInt() @Min(6) @Max(23) escoreBraden?: number;
  @IsOptional() @IsString() estadoNutricional?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10) dorGeral?: number;
  @IsOptional() @IsString() curativoAtual?: string;
  @IsOptional() @IsString() adesaoTratamento?: string;
  @IsOptional() @IsString() orientacoesFornecidas?: string;
  @IsOptional() @IsString() evolucao?: string;
  @IsOptional() @IsString() planoProximosPassos?: string;
  @IsOptional() @IsString() coren?: string;
}

