import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReavaliarPlanoDto {
  @IsString()
  @MinLength(10, { message: 'relatoEvolucao precisa descrever a evolução (mín. 10 caracteres)' })
  @MaxLength(20_000)
  relatoEvolucao!: string;

  /** Valores atuais medidos (sinais vitais, reavaliação da ferida). */
  @IsObject()
  @IsOptional()
  avaliacaoAtual?: Record<string, unknown>;
}
