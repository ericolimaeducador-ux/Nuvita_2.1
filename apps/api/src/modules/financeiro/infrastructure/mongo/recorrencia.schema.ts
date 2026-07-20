import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CategoriaLancamento, TipoLancamento } from '../../domain/lancamento.entity';

export type RecorrenciaDocument = HydratedDocument<RecorrenciaMongo>;

@Schema({ collection: 'recorrencias_financeiras', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } })
export class RecorrenciaMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ required: true }) descricao!: string;
  @Prop({ required: true, enum: TipoLancamento, index: true }) tipo!: TipoLancamento;
  @Prop({ required: true, enum: CategoriaLancamento }) categoria!: CategoriaLancamento;
  @Prop({ index: true }) instituicaoId?: string;
  @Prop({ required: true, min: 0 }) valorMensal!: number;
  @Prop({ required: true, min: 1, max: 28 }) diaVencimento!: number;
  @Prop({ required: true }) inicio!: Date;
  @Prop() fim?: Date;
  @Prop({ default: true, index: true }) ativo!: boolean;
  criadoEm!: Date;
  atualizadoEm?: Date;
}

export const RecorrenciaSchema = SchemaFactory.createForClass(RecorrenciaMongo);
RecorrenciaSchema.index({ clinicaId: 1, ativo: 1 });
