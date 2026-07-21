import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReceituarioEnfermagem } from '../../domain/receituario-enfermagem.entity';
import { ReceituarioEnfermagemRepository } from '../../application/ports/receituario-enfermagem.repository';
import { ReceituarioEnfermagemDocument, ReceituarioEnfermagemMongo } from './receituario-enfermagem.schema';

@Injectable()
export class ReceituarioEnfermagemMongoRepository implements ReceituarioEnfermagemRepository {
  constructor(
    @InjectModel(ReceituarioEnfermagemMongo.name) private readonly model: Model<ReceituarioEnfermagemDocument>,
  ) {}

  async create(data: Omit<ReceituarioEnfermagem, 'id' | 'criadoEm'>): Promise<ReceituarioEnfermagem> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<ReceituarioEnfermagem | null> {
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<ReceituarioEnfermagem[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  private toEntity(doc: Record<string, unknown>): ReceituarioEnfermagem {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as ReceituarioEnfermagem;
  }
}
