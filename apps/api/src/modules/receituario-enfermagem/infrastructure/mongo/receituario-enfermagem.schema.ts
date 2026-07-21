import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReceituarioEnfermagemDocument = HydratedDocument<ReceituarioEnfermagemMongo>;

@Schema({ _id: false })
export class ItemReceituarioMongo {
  @Prop()
  produtoId?: string;

  @Prop({ required: true })
  nome!: string;

  @Prop({ required: true })
  quantidade!: number;

  @Prop({ required: true })
  instrucoesUso!: string;
}

// Append-only, como observacoes_paciente: uma prescrição errada vira uma nova,
// nunca edita/apaga a antiga (mesmo princípio de um talão de papel).
@Schema({ collection: 'receituarios_enfermagem', versionKey: false })
export class ReceituarioEnfermagemMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop()
  feridaId?: string;

  @Prop({ required: true })
  enfermeiroId!: string;

  @Prop({ required: true, type: [ItemReceituarioMongo] })
  itens!: ItemReceituarioMongo[];

  @Prop()
  observacoes?: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const ReceituarioEnfermagemSchema = SchemaFactory.createForClass(ReceituarioEnfermagemMongo);
ReceituarioEnfermagemSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });

const rejectMutation = () => {
  throw new Error('Receituario de enfermagem e append-only.');
};
ReceituarioEnfermagemSchema.pre('updateOne', rejectMutation);
ReceituarioEnfermagemSchema.pre('updateMany', rejectMutation);
ReceituarioEnfermagemSchema.pre('findOneAndUpdate', rejectMutation);
ReceituarioEnfermagemSchema.pre('deleteOne', rejectMutation);
ReceituarioEnfermagemSchema.pre('deleteMany', rejectMutation);
ReceituarioEnfermagemSchema.pre('findOneAndDelete', rejectMutation);
