import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TipoInstituicao } from '../../domain/instituicao.entity';

export type InstituicaoDocument = HydratedDocument<InstituicaoMongo>;

@Schema({ collection: 'instituicoes', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } })
export class InstituicaoMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ required: true }) nome!: string;
  @Prop({ required: true, enum: TipoInstituicao, index: true }) tipo!: TipoInstituicao;
  @Prop() cnpj?: string;
  @Prop() contatoNome?: string;
  @Prop() contatoEmail?: string;
  @Prop() contatoTelefone?: string;
  @Prop() observacoes?: string;
  @Prop({ default: true, index: true }) ativo!: boolean;
  criadoEm!: Date;
  atualizadoEm?: Date;
}

export const InstituicaoSchema = SchemaFactory.createForClass(InstituicaoMongo);
InstituicaoSchema.index({ clinicaId: 1, nome: 1 }, { unique: true });
