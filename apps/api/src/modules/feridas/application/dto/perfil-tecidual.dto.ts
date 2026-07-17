import { IsInt, Max, Min } from 'class-validator';

/** Soma dos 4 percentuais validada na service (não aqui) — precisa dos 4 valores juntos para checar o total. */
export class PerfilTecidualDto {
  @IsInt() @Min(0) @Max(100) granulacaoPct!: number;
  @IsInt() @Min(0) @Max(100) epitelizacaoPct!: number;
  @IsInt() @Min(0) @Max(100) esfaceloPct!: number;
  @IsInt() @Min(0) @Max(100) necrosePct!: number;
}
