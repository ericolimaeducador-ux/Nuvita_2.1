import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssinaturaTermo, TermoConsentimento } from '../../domain/termo-consentimento.entity';
import { TermoConsentimentoRepository } from '../../application/ports/termo-consentimento.repository';
import { TermoConsentimentoDocument, TermoConsentimentoMongo } from './termo-consentimento.schema';

@Injectable()
export class TermoConsentimentoMongoRepository implements TermoConsentimentoRepository {
  constructor(
    @InjectModel(TermoConsentimentoMongo.name) private readonly model: Model<TermoConsentimentoDocument>,
  ) {}

  async create(data: Omit<TermoConsentimento, 'id' | 'criadoEm' | 'assinatura'>): Promise<TermoConsentimento> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<TermoConsentimento | null> {
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<TermoConsentimento[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async sign(clinicaId: string, id: string, assinatura: AssinaturaTermo): Promise<TermoConsentimento | null> {
    // Update condicional e atômico: só aplica se ainda não houver assinatura —
    // fecha a corrida de duas chamadas concorrentes assinando o mesmo termo.
    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(id), assinatura: { $exists: false } },
        { $set: { assinatura } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): TermoConsentimento {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as TermoConsentimento;
  }
}
