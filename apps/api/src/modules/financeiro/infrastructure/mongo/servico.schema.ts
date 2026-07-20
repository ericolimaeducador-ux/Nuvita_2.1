import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TipoServico } from '../../domain/servico.entity';

export type ServicoDocument = HydratedDocument<ServicoMongo>;

@Schema({ collection: 'servicos_financeiros', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } })
export class ServicoMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ required: true }) nome!: string;
  @Prop({ required: true, enum: TipoServico, index: true }) tipo!: TipoServico;
  @Prop({ required: true, min: 0 }) preco!: number;
  @Prop() descricao?: string;
  @Prop({ default: true, index: true }) ativo!: boolean;
  criadoEm!: Date;
  atualizadoEm?: Date;
}

export const ServicoSchema = SchemaFactory.createForClass(ServicoMongo);
ServicoSchema.index({ clinicaId: 1, nome: 1 }, { unique: true });
