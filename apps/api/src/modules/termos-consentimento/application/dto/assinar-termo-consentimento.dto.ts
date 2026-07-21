import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssinarTermoConsentimentoDto {
  /** Nome completo digitado pelo próprio paciente (ou responsável legal) na tela, no momento do atendimento. */
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nomeAssinante!: string;
}
