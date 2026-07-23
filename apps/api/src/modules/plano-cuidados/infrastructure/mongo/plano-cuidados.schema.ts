import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TaxonomiaTermo, TipoAcao } from '../../domain/catalogo-clinico.entity';
import {
  DecisaoEvolucao,
  NivelCuidado,
  PrioridadeDiagnostico,
  StatusDiagnostico,
  StatusPlano,
  UrgenciaAcao,
} from '../../domain/plano-cuidados.entity';

export type PlanoCuidadosDocument = HydratedDocument<PlanoCuidadosMongo>;

@Schema({ _id: false })
class DiagnosticoSchema {
  @Prop({ required: true, enum: Object.values(PrioridadeDiagnostico) })
  prioridade!: PrioridadeDiagnostico;

  @Prop({ required: true }) codigoFenomeno!: string;
  @Prop({ required: true }) enunciado!: string;
  @Prop({ type: [String], default: [] }) relacionadoA!: string[];
  @Prop({ type: [String], default: [] }) evidenciadoPor!: string[];

  @Prop({ required: true, enum: Object.values(StatusDiagnostico) })
  status!: StatusDiagnostico;

  @Prop({ required: true }) raciocinioClinico!: string;

  @Prop({
    required: true,
    enum: Object.values(TaxonomiaTermo),
    default: TaxonomiaTermo.LOCAL_PROVISORIO,
  })
  taxonomia!: TaxonomiaTermo;
}

@Schema({ _id: false })
class IndicadorMetaSchema {
  @Prop({ required: true }) descricao!: string;
  @Prop({ required: true }) valorBaseline!: string;
  @Prop({ required: true }) valorMeta!: string;
  @Prop({ required: true }) metodoAvaliacao!: string;
  @Prop({ required: true }) frequencia!: string;
}

@Schema({ _id: false })
class ResultadoEsperadoSchema {
  @Prop({ required: true }) diagnosticoRef!: string;
  @Prop({ required: true }) codigo!: string;
  @Prop({ required: true }) titulo!: string;
  @Prop({ required: true, min: 1, max: 5 }) escoreBaseline!: number;
  @Prop() justificativaBaseline?: string;
  @Prop({ required: true, min: 1, max: 5 }) escoreMeta!: number;
  @Prop({ required: true }) prazo!: string;
  @Prop({ type: [IndicadorMetaSchema], default: [] }) indicadores!: IndicadorMetaSchema[];

  @Prop({
    required: true,
    enum: Object.values(TaxonomiaTermo),
    default: TaxonomiaTermo.LOCAL_PROVISORIO,
  })
  taxonomia!: TaxonomiaTermo;
}

@Schema({ _id: false })
class AtividadePrescritaSchema {
  @Prop({ required: true }) descricao!: string;
  @Prop({ required: true }) frequencia!: string;
  @Prop({ required: true }) responsavel!: string;
  @Prop({ required: true, default: '' }) registro!: string;
}

@Schema({ _id: false })
class AcaoPrescritaSchema {
  @Prop({ required: true }) codigo!: string;
  @Prop({ required: true }) titulo!: string;
  @Prop({ required: true, enum: Object.values(TipoAcao) }) tipo!: TipoAcao;
  @Prop({ required: true, enum: Object.values(UrgenciaAcao) }) urgencia!: UrgenciaAcao;
  @Prop({ type: [AtividadePrescritaSchema], default: [] }) atividades!: AtividadePrescritaSchema[];
  @Prop({ type: [String], default: [] }) alertasReavaliacao!: string[];

  @Prop({
    required: true,
    enum: Object.values(TaxonomiaTermo),
    default: TaxonomiaTermo.LOCAL_PROVISORIO,
  })
  taxonomia!: TaxonomiaTermo;
}

@Schema({ _id: false })
class PrescricaoSchema {
  @Prop({ required: true }) diagnosticoRef!: string;
  @Prop({ required: true, default: '' }) resultadoRef!: string;
  @Prop({ type: [AcaoPrescritaSchema], default: [] }) acoes!: AcaoPrescritaSchema[];
  @Prop({ type: [String], default: [] }) orientacoesPacienteCuidador!: string[];
}

@Schema({ _id: false })
class DecisaoDiagnosticoSchema {
  @Prop({ required: true }) diagnosticoRef!: string;
  @Prop({ required: true, enum: Object.values(DecisaoEvolucao) }) decisao!: DecisaoEvolucao;
  @Prop({ required: true }) justificativa!: string;
  @Prop({ required: true }) escoreAnterior!: number;
  @Prop({ required: true }) escoreAtual!: number;
  @Prop() progressoPct?: number;
}

@Schema({ _id: false })
class NotaSoapSchema {
  @Prop({ required: true, default: '' }) s!: string;
  @Prop({ required: true, default: '' }) o!: string;
  @Prop({ required: true, default: '' }) a!: string;
  @Prop({ required: true, default: '' }) p!: string;
}

@Schema({ _id: false })
class NovoFenomenoSchema {
  @Prop({ required: true }) titulo!: string;
  @Prop({ required: true }) justificativa!: string;
}

/** Append-only: evolução se acrescenta, não se corrige. */
@Schema({ _id: false })
class EvolucaoPlanoSchema {
  @Prop({ required: true, default: Date.now, immutable: true }) data!: Date;
  @Prop({ required: true }) enfermeiroId!: string;
  @Prop({ required: true }) relatoTexto!: string;
  @Prop({ type: [DecisaoDiagnosticoSchema], default: [] }) decisoes!: DecisaoDiagnosticoSchema[];
  @Prop({ type: NotaSoapSchema, required: true }) textoSoap!: NotaSoapSchema;
  @Prop({ type: [NovoFenomenoSchema], default: [] }) novosFenomenos!: NovoFenomenoSchema[];
}

@Schema({ _id: false })
class RegistroAuditoriaIaSchema {
  @Prop({ required: true }) skill!: string;
  @Prop({ required: true }) modelo!: string;
  @Prop({ required: true, default: 0 }) tokensEntrada!: number;
  @Prop({ required: true, default: 0 }) tokensSaida!: number;
  @Prop({ required: true, default: Date.now }) em!: Date;
}

@Schema({ collection: 'planos_cuidados', versionKey: false, timestamps: true })
export class PlanoCuidadosMongo {
  @Prop({ required: true, index: true })
  pacienteId!: string;

  /** Multi-tenancy — toda query filtra por aqui. String, como no resto do repo. */
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true })
  enfermeiroId!: string;

  @Prop({ required: true })
  historicoTexto!: string;

  @Prop()
  exameFisicoTexto?: string;

  @Prop({ enum: Object.values(NivelCuidado) })
  nivelCuidado?: NivelCuidado;

  /** Referência ao módulo de feridas — só o id, sem acoplar os domínios. */
  @Prop()
  avaliacaoFeridaId?: string;

  @Prop({ type: Object, default: {} })
  dadosEstruturados!: Record<string, unknown>;

  @Prop({ type: [DiagnosticoSchema], default: [] })
  diagnosticos!: DiagnosticoSchema[];

  @Prop({ type: [ResultadoEsperadoSchema], default: [] })
  resultadosEsperados!: ResultadoEsperadoSchema[];

  @Prop({ type: [PrescricaoSchema], default: [] })
  prescricoes!: PrescricaoSchema[];

  @Prop({ type: [EvolucaoPlanoSchema], default: [] })
  evolucoes!: EvolucaoPlanoSchema[];

  @Prop({ required: true, enum: Object.values(StatusPlano), default: StatusPlano.ATIVO })
  status!: StatusPlano;

  /** Versão do catálogo vigente na geração — padrão de `escalas.versao`. */
  @Prop({ required: true })
  versaoCatalogo!: string;

  /**
   * HMAC do plano no momento da geração. É prova de integridade com trilha de
   * auditoria — NÃO assinatura digital (isso exigiria ICP-Brasil).
   */
  @Prop()
  hashIntegridade?: string;

  @Prop({ type: [RegistroAuditoriaIaSchema], default: [] })
  auditoriaIa!: RegistroAuditoriaIaSchema[];

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const PlanoCuidadosSchema = SchemaFactory.createForClass(PlanoCuidadosMongo);
PlanoCuidadosSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });
PlanoCuidadosSchema.index({ clinicaId: 1, status: 1 });
