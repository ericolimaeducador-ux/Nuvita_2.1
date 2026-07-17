import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AvaliacaoFerida } from '../../domain/avaliacao-ferida.entity';
import { AvaliacaoFeridaRepository } from '../../application/ports/avaliacao-ferida.repository';
import { AvaliacaoFeridaDocument, AvaliacaoFeridaMongo } from './avaliacao-ferida.schema';

@Injectable()
export class AvaliacaoFeridaMongoRepository implements AvaliacaoFeridaRepository {
  constructor(
    @InjectModel(AvaliacaoFeridaMongo.name) private readonly model: Model<AvaliacaoFeridaDocument>,
  ) {}

  async create(data: Omit<AvaliacaoFerida, 'id' | 'criadoEm'>): Promise<AvaliacaoFerida> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<AvaliacaoFerida | null> {
    const doc = await this.model.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByFerida(clinicaId: string, feridaId: string): Promise<AvaliacaoFerida[]> {
    const docs = await this.model.find({ clinicaId, feridaId }).sort({ criadoEm: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  private toEntity(doc: Record<string, unknown>): AvaliacaoFerida {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as AvaliacaoFerida;
  }
}
