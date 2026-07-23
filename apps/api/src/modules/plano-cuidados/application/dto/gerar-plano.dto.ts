import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ContextoEstomaterapia } from '../../domain/catalogo-clinico.entity';
import { NivelCuidado } from '../../domain/plano-cuidados.entity';

/**
 * Os tetos de tamanho não são estéticos: o texto vai inteiro para o motor de
 * raciocínio, então limite aqui é limite de custo e de superfície de exposição
 * de dado sensível.
 */
export class GerarPlanoDto {
  @IsMongoId()
  pacienteId!: string;

  @IsString()
  @MinLength(20, { message: 'historicoTexto precisa de contexto clínico suficiente (mín. 20 caracteres)' })
  @MaxLength(20_000)
  historicoTexto!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20_000)
  exameFisicoTexto?: string;

  /** Integra com o módulo de feridas existente. */
  @IsMongoId()
  @IsOptional()
  avaliacaoFeridaId?: string;

  @IsEnum(NivelCuidado)
  @IsOptional()
  nivelCuidado?: NivelCuidado;

  @IsEnum(ContextoEstomaterapia)
  @IsOptional()
  contextoEstomaterapia?: ContextoEstomaterapia;
}
