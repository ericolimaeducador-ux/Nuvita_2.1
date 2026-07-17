import { IsNumber, IsOptional, Min } from 'class-validator';

/** area_cm2 é calculada na service (comprimento × largura) quando ausente — espelha o model_validator do Pydantic. */
export class MedicaoDto {
  @IsNumber() @Min(0) comprimentoCm!: number;
  @IsNumber() @Min(0) larguraCm!: number;
  @IsNumber() @Min(0) profundidadeCm!: number;
  @IsOptional() @IsNumber() @Min(0) areaCm2?: number;
}
