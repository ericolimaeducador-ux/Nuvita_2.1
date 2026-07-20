import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  CategoriaLancamento,
  FormaPagamento,
  StatusLancamento,
  TipoLancamento,
} from '../../domain/lancamento.entity';

export type LancamentoDocument = HydratedDocument<LancamentoMongo>;

@Schema({ collection: 'lancamentos_financeiros', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } })
export class LancamentoMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ index: true }) pacienteId?: string;
  @Prop({ index: true }) agendamentoId?: string;
  @Prop({ required: true, enum: TipoLancamento, index: true }) tipo!: TipoLancamento;
  @Prop({ required: true }) descricao!: string;
  @Prop({ required: true }) valor!: number;
  @Prop({ enum: FormaPagamento }) formaPagamento?: FormaPagamento;
  @Prop({ required: true, enum: StatusLancamento, default: StatusLancamento.PENDENTE, index: true }) status!: StatusLancamento;
  @Prop({ index: true }) vencimento?: Date;
  @Prop({ index: true }) recebidoEm?: Date;
  @Prop() observacoes?: string;
  @Prop({ enum: CategoriaLancamento, index: true }) categoria?: CategoriaLancamento;
  @Prop({ index: true }) servicoId?: string;
  @Prop({ index: true }) produtoId?: string;
  @Prop() quantidade?: number;
  @Prop() custoUnitario?: number;
  @Prop({ index: true }) instituicaoId?: string;
  @Prop({ index: true }) recorrenciaId?: string;
  @Prop() competencia?: string;
  @Prop({ required: true }) criadoPor!: string;
  criadoEm!: Date;
  atualizadoEm?: Date;
}

export const LancamentoSchema = SchemaFactory.createForClass(LancamentoMongo);

LancamentoSchema.index({ clinicaId: 1, status: 1, criadoEm: -1 });
LancamentoSchema.index({ clinicaId: 1, tipo: 1, criadoEm: -1 });
LancamentoSchema.index({ clinicaId: 1, vencimento: 1, status: 1 });
LancamentoSchema.index({ clinicaId: 1, categoria: 1, criadoEm: -1 });
// Regime de caixa: os relatorios agregam pela data em que o dinheiro entrou.
LancamentoSchema.index({ clinicaId: 1, recebidoEm: -1 });
/**
 * Idempotencia da recorrencia: uma competencia so pode existir uma vez por
 * recorrencia. E o que permite materializar as competencias a qualquer momento
 * (inclusive concorrentemente) sem gerar cobranca duplicada. Parcial para nao
 * colidir entre os varios lancamentos avulsos, que nao tem esses campos.
 */
LancamentoSchema.index(
  { clinicaId: 1, recorrenciaId: 1, competencia: 1 },
  { unique: true, partialFilterExpression: { recorrenciaId: { $exists: true } } },
);
