import { IsEnum, IsISO8601, IsMongoId, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAtendimento } from '../../domain/prontuario.entity';
import {
  ArquivoProntuarioDto,
  AvaliacaoDto,
  ObjetivoDto,
  PlanoDto,
  RegistroEnfermagemDto,
  SubjetivoDto,
} from './soap.dto';

// Consulta de enfermagem não é um SOAP tradicional — os 4 blocos SOAP ficam
// dispensados de validação/obrigatoriedade nesse tipo.
const ehAtendimentoSoap = (o: CreateProntuarioDto) =>
  o.tipo !== TipoAtendimento.CONSULTA_ENFERMAGEM;

export class CreateProntuarioDto {
  @IsMongoId()
  clinicaId!: string;

  @IsMongoId()
  pacienteId!: string;

  @IsOptional()
  @IsMongoId()
  agendamentoId?: string;

  @IsISO8601()
  dataAtendimento!: string;

  @IsEnum(TipoAtendimento)
  tipo!: TipoAtendimento;

  @ValidateIf(ehAtendimentoSoap)
  @ValidateNested()
  @Type(() => SubjetivoDto)
  subjetivo?: SubjetivoDto;

  @ValidateIf(ehAtendimentoSoap)
  @ValidateNested()
  @Type(() => ObjetivoDto)
  objetivo?: ObjetivoDto;

  @ValidateIf(ehAtendimentoSoap)
  @ValidateNested()
  @Type(() => AvaliacaoDto)
  avaliacao?: AvaliacaoDto;

  @ValidateIf(ehAtendimentoSoap)
  @ValidateNested()
  @Type(() => PlanoDto)
  plano?: PlanoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RegistroEnfermagemDto)
  registroEnfermagem?: RegistroEnfermagemDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ArquivoProntuarioDto)
  arquivos?: ArquivoProntuarioDto[];
}
