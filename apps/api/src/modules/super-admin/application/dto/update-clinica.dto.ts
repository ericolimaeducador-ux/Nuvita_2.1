import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PlanoClinica } from '../../../clinicas/domain/clinica.entity';
import { EnderecoClinicaDto } from '../../../clinicas/application/dto/create-clinica.dto';

export class ResponsavelTecnicoDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  @IsNotEmpty()
  registroProfissional!: string;
}

export class UpdateConfiguracoesClinicaDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResponsavelTecnicoDto)
  responsavelTecnico?: ResponsavelTecnicoDto;
}

export class UpdateClinicaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @IsOptional()
  @IsEnum(PlanoClinica)
  plano?: PlanoClinica;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoClinicaDto)
  endereco?: EnderecoClinicaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateConfiguracoesClinicaDto)
  configuracoes?: UpdateConfiguracoesClinicaDto;
}
