import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TipoProduto } from '../../domain/produto.entity';

export type ProdutoDocument = HydratedDocument<ProdutoMongo>;

@Schema({ collection: 'produtos', versionKey: false })
export class ProdutoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  nome!: string;

  @Prop()
  codigo?: string;

  @Prop({ required: true, enum: Object.values(TipoProduto), index: true })
  tipo!: TipoProduto;

  @Prop({ required: true, min: 0 })
  precoVenda!: number;

  @Prop({ min: 0 })
  custo?: number;

  @Prop()
  unidade?: string;

  @Prop()
  apresentacao?: string;

  @Prop()
  fabricante?: string;

  @Prop()
  observacoes?: string;

  @Prop({ default: true, index: true })
  ativo!: boolean;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const ProdutoSchema = SchemaFactory.createForClass(ProdutoMongo);
// Nome unico dentro da clinica (evita cadastro duplicado do mesmo item).
ProdutoSchema.index({ clinicaId: 1, nome: 1 }, { unique: true });
// Codigo unico dentro da clinica quando informado — sparse pois produtos sem
// codigo (cadastro livre) nao podem colidir em codigo: null.
ProdutoSchema.index({ clinicaId: 1, codigo: 1 }, { unique: true, sparse: true });
