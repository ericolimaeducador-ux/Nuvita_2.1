import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Etiologia, StatusFerida } from '../../domain/ferida.entity';

export type FeridaDocument = HydratedDocument<FeridaMongo>;

@Schema({ collection: 'feridas', versionKey: false })
export class FeridaMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true })
  rotulo!: string;

  @Prop({ required: true, enum: Object.values(Etiologia) })
  etiologia!: Etiologia;

  @Prop({ required: true })
  localizacao!: string;

  @Prop({ required: true, enum: Object.values(StatusFerida), index: true })
  status!: StatusFerida;

  @Prop()
  dataInicio?: Date;

  @Prop()
  observacoes?: string;

  @Prop({ index: true })
  excluidoEm?: Date;

  @Prop()
  excluidoPor?: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const FeridaSchema = SchemaFactory.createForClass(FeridaMongo);
FeridaSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });
