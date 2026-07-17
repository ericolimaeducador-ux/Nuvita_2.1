import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ferida } from '../../domain/ferida.entity';
import { FeridaRepository } from '../../application/ports/ferida.repository';
import { FeridaDocument, FeridaMongo } from './ferida.schema';

@Injectable()
export class FeridaMongoRepository implements FeridaRepository {
  constructor(@InjectModel(FeridaMongo.name) private readonly model: Model<FeridaDocument>) {}

  async create(data: Omit<Ferida, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Ferida> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async update(
    clinicaId: string,
    id: string,
    data: Partial<Pick<Ferida, 'rotulo' | 'status' | 'observacoes'>>,
  ): Promise<Ferida | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, excluidoEm: { $exists: false } },
        { $set: { ...data, atualizadoEm: new Date() } },
        { new: true, lean: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findById(clinicaId: string, id: string): Promise<Ferida | null> {
    const doc = await this.model.findOne({ _id: id, clinicaId, excluidoEm: { $exists: false } }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<Ferida[]> {
    const docs = await this.model
      .find({ clinicaId, pacienteId, excluidoEm: { $exists: false } })
      .sort({ criadoEm: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async softDelete(clinicaId: string, id: string, excluidoPor: string): Promise<Ferida | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, excluidoEm: { $exists: false } },
        { $set: { excluidoEm: new Date(), excluidoPor } },
        { new: true, lean: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): Ferida {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as Ferida;
  }
}
