import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TipoTermo } from '../../domain/termo-consentimento.entity';

export type TermoConsentimentoDocument = HydratedDocument<TermoConsentimentoMongo>;

@Schema({ _id: false })
export class AssinaturaTermoMongo {
  @Prop({ required: true })
  nomeAssinante!: string;

  @Prop({ required: true })
  dataAssinatura!: Date;

  @Prop({ required: true })
  hash!: string;

  @Prop({ required: true })
  assinadoPor!: string;
}

@Schema({ collection: 'termos_consentimento', versionKey: false })
export class TermoConsentimentoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, enum: Object.values(TipoTermo) })
  tipo!: TipoTermo;

  @Prop({ required: true })
  versaoTexto!: string;

  @Prop({ type: AssinaturaTermoMongo })
  assinatura?: AssinaturaTermoMongo;

  @Prop({ required: true })
  criadoPor!: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const TermoConsentimentoSchema = SchemaFactory.createForClass(TermoConsentimentoMongo);
TermoConsentimentoSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });
