import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ContextoEstomaterapia,
  EixoFenomeno,
  TaxonomiaTermo,
  TipoAcao,
} from '../../domain/catalogo-clinico.entity';

/**
 * Catálogo clínico — coleções globais, NÃO multi-tenant.
 *
 * O vocabulário é o mesmo para toda clínica (é taxonomia, não dado de
 * paciente), então estas três coleções não levam `clinicaId`. O dado clínico
 * do paciente vive só em `planos_cuidados`, esse sim filtrado por tenant.
 */

export type CatalogoFenomenoDocument = HydratedDocument<CatalogoFenomenoMongo>;
export type CatalogoAcaoDocument = HydratedDocument<CatalogoAcaoMongo>;
export type CatalogoResultadoDocument = HydratedDocument<CatalogoResultadoMongo>;

@Schema({ collection: 'catalogo_fenomenos', versionKey: false, timestamps: true })
export class CatalogoFenomenoMongo {
  @Prop({ required: true, unique: true })
  codigo!: string;

  @Prop({ required: true })
  titulo!: string;

  @Prop()
  definicao?: string;

  @Prop({ required: true, enum: Object.values(EixoFenomeno) })
  eixo!: EixoFenomeno;

  @Prop({
    required: true,
    enum: Object.values(TaxonomiaTermo),
    default: TaxonomiaTermo.LOCAL_PROVISORIO,
  })
  taxonomia!: TaxonomiaTermo;

  /** Só deixa de ser null quando a licença CIPE® permitir o cruzamento. */
  @Prop({ type: String, default: null })
  codigoCipeOficial!: string | null;

  @Prop({ type: [String], default: [] })
  sinonimos!: string[];

  @Prop({ type: [String], default: [] })
  manifestacoesClinicas!: string[];

  @Prop({ type: [String], default: [] })
  fatoresRelacionados!: string[];

  @Prop({ type: [String], enum: Object.values(ContextoEstomaterapia), default: [] })
  contextoEstomaterapia!: ContextoEstomaterapia[];

  @Prop({ type: [String], default: [] })
  acoesVinculadas!: string[];

  @Prop({ type: [String], default: [] })
  resultadosVinculados!: string[];

  @Prop({ type: [String], default: [] })
  palavrasChave!: string[];
}

export const CatalogoFenomenoSchema = SchemaFactory.createForClass(CatalogoFenomenoMongo);
// Índice de texto em português: o acervo clínico é todo em pt-BR, e sem isto o
// Mongo aplicaria stemming/stopwords do inglês.
CatalogoFenomenoSchema.index(
  { titulo: 'text', palavrasChave: 'text', manifestacoesClinicas: 'text', sinonimos: 'text' },
  { name: 'idx_catalogo_fenomeno_text', default_language: 'portuguese' },
);
CatalogoFenomenoSchema.index({ eixo: 1 });
CatalogoFenomenoSchema.index({ contextoEstomaterapia: 1 });

@Schema({ collection: 'catalogo_acoes', versionKey: false, timestamps: true })
export class CatalogoAcaoMongo {
  @Prop({ required: true, unique: true })
  codigo!: string;

  @Prop({ required: true })
  titulo!: string;

  @Prop()
  definicao?: string;

  @Prop({
    required: true,
    enum: Object.values(TaxonomiaTermo),
    default: TaxonomiaTermo.LOCAL_PROVISORIO,
  })
  taxonomia!: TaxonomiaTermo;

  @Prop({ type: String, default: null })
  codigoCipeOficial!: string | null;

  @Prop({ type: [String], default: [] })
  atividades!: string[];

  @Prop({ required: true, enum: Object.values(TipoAcao), default: TipoAcao.AUTONOMA })
  tipo!: TipoAcao;

  @Prop({ type: [String], default: [] })
  frequenciasRecomendadas!: string[];

  @Prop({ type: [String], default: [] })
  fenomenosVinculados!: string[];

  @Prop({ type: [String], default: [] })
  palavrasChave!: string[];
}

export const CatalogoAcaoSchema = SchemaFactory.createForClass(CatalogoAcaoMongo);
CatalogoAcaoSchema.index(
  { titulo: 'text', palavrasChave: 'text', atividades: 'text' },
  { name: 'idx_catalogo_acao_text', default_language: 'portuguese' },
);
CatalogoAcaoSchema.index({ fenomenosVinculados: 1 });

@Schema({ _id: false })
class EscalaResultadoSchema {
  @Prop({ required: true }) tipo!: string;
  @Prop({ required: true }) descricao1!: string;
  @Prop({ required: true }) descricao5!: string;
}

@Schema({ _id: false })
class IndicadorResultadoSchema {
  @Prop({ required: true }) codigo!: string;
  @Prop({ required: true }) descricao!: string;
}

@Schema({ collection: 'catalogo_resultados', versionKey: false, timestamps: true })
export class CatalogoResultadoMongo {
  @Prop({ required: true, unique: true })
  codigo!: string;

  @Prop({ required: true })
  titulo!: string;

  @Prop()
  definicao?: string;

  @Prop({
    required: true,
    enum: Object.values(TaxonomiaTermo),
    default: TaxonomiaTermo.LOCAL_PROVISORIO,
  })
  taxonomia!: TaxonomiaTermo;

  @Prop({ type: String, default: null })
  codigoCipeOficial!: string | null;

  @Prop({ type: EscalaResultadoSchema })
  escala?: EscalaResultadoSchema;

  @Prop({ type: [IndicadorResultadoSchema], default: [] })
  indicadores!: IndicadorResultadoSchema[];

  @Prop({ type: [String], default: [] })
  fenomenosVinculados!: string[];

  @Prop({ type: [String], default: [] })
  palavrasChave!: string[];
}

export const CatalogoResultadoSchema = SchemaFactory.createForClass(CatalogoResultadoMongo);
CatalogoResultadoSchema.index(
  { titulo: 'text', palavrasChave: 'text' },
  { name: 'idx_catalogo_resultado_text', default_language: 'portuguese' },
);
CatalogoResultadoSchema.index({ fenomenosVinculados: 1 });
