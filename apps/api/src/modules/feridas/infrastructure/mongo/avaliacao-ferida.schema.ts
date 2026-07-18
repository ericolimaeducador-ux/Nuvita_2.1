import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AchadoPerilesional, NivelExsudato, NivelRisco } from '../../domain/avaliacao-ferida.entity';
import { BordasFerida, SinalInfeccaoResvech, TecidosAfetados } from '../../domain/escalas';

export type AvaliacaoFeridaDocument = HydratedDocument<AvaliacaoFeridaMongo>;

@Schema({ _id: false })
class MedicaoSchema {
  @Prop({ required: true }) comprimentoCm!: number;
  @Prop({ required: true }) larguraCm!: number;
  @Prop({ required: true }) profundidadeCm!: number;
  @Prop() areaCm2?: number;
}

@Schema({ _id: false })
class PerfilTecidualSchema {
  @Prop({ required: true }) granulacaoPct!: number;
  @Prop({ required: true }) epitelizacaoPct!: number;
  @Prop({ required: true }) esfaceloPct!: number;
  @Prop({ required: true }) necrosePct!: number;
}

@Schema({ _id: false })
class PushScoreSchema {
  @Prop({ required: true }) area!: number;
  @Prop({ required: true }) exsudato!: number;
  @Prop({ required: true }) tipoTecido!: number;
  @Prop({ required: true }) total!: number;
}

@Schema({ _id: false })
class ResvechScoreSchema {
  @Prop({ required: true }) dimensao!: number;
  @Prop({ required: true }) profundidade!: number;
  @Prop({ required: true }) bordas!: number;
  @Prop({ required: true }) tecidoLeito!: number;
  @Prop({ required: true }) exsudato!: number;
  @Prop({ required: true }) infeccaoInflamacao!: number;
  @Prop({ required: true }) total!: number;
}

@Schema({ _id: false })
class EscalasClinicasSchema {
  @Prop({ type: PushScoreSchema, required: true }) push!: PushScoreSchema;
  @Prop({ type: ResvechScoreSchema }) resvech?: ResvechScoreSchema;
  @Prop({ required: true }) versao!: string;
}

@Schema({ _id: false })
class RecomendacaoClinicaSchema {
  @Prop({ required: true, enum: Object.values(NivelRisco) }) risco!: NivelRisco;
  @Prop({ required: true }) titulo!: string;
  @Prop({ required: true }) justificativa!: string;
  @Prop({ required: true }) acao!: string;
  @Prop({ required: true }) regraId!: string;
  @Prop({ required: true, default: true }) exigeRevisaoHumana!: true;
}

@Schema({ collection: 'avaliacoes_ferida', versionKey: false })
export class AvaliacaoFeridaMongo {
  @Prop({ required: true, index: true })
  feridaId!: string;

  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true })
  profissionalId!: string;

  @Prop({ type: MedicaoSchema, required: true })
  medicao!: MedicaoSchema;

  @Prop({ type: PerfilTecidualSchema, required: true })
  tecido!: PerfilTecidualSchema;

  @Prop({ required: true, enum: Object.values(NivelExsudato) })
  exsudato!: NivelExsudato;

  @Prop({ required: true, default: 0 })
  escalaDor!: number;

  @Prop({ required: true, default: false })
  odor!: boolean;

  @Prop({ type: [String], enum: Object.values(AchadoPerilesional), default: [] })
  achadosPerilesionais!: AchadoPerilesional[];

  @Prop({ required: true, default: false })
  sinaisSistemicos!: boolean;

  @Prop({ required: true, default: false })
  perfusaoRuim!: boolean;

  @Prop({ required: true, default: false })
  ossoOuTendaoExposto!: boolean;

  @Prop()
  pioraAreaPct30Dias?: number;

  @Prop()
  diasCicatrizacaoEstagnada?: number;

  @Prop({ enum: Object.values(BordasFerida) })
  bordas?: BordasFerida;

  @Prop({ enum: Object.values(TecidosAfetados) })
  tecidosAfetados?: TecidosAfetados;

  @Prop({ type: [String], enum: Object.values(SinalInfeccaoResvech) })
  sinaisInfeccao?: SinalInfeccaoResvech[];

  @Prop({ type: [RecomendacaoClinicaSchema], required: true })
  recomendacoes!: RecomendacaoClinicaSchema[];

  @Prop({ required: true })
  motorClinico!: string;

  @Prop({ type: EscalasClinicasSchema })
  escalas?: EscalasClinicasSchema;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const AvaliacaoFeridaSchema = SchemaFactory.createForClass(AvaliacaoFeridaMongo);
AvaliacaoFeridaSchema.index({ clinicaId: 1, feridaId: 1, criadoEm: 1 });
