import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { PlanoCuidadosRepository } from '../../application/ports/plano-cuidados.repository';
import { EvolucaoPlano, PlanoCuidados } from '../../domain/plano-cuidados.entity';
import { PlanoCuidadosDocument, PlanoCuidadosMongo } from './plano-cuidados.schema';

@Injectable()
export class PlanoCuidadosMongoRepository implements PlanoCuidadosRepository {
  constructor(
    @InjectModel(PlanoCuidadosMongo.name) private readonly model: Model<PlanoCuidadosDocument>,
  ) {}

  async create(
    data: Omit<PlanoCuidados, 'id' | 'criadoEm' | 'atualizadoEm'>,
  ): Promise<PlanoCuidados> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<PlanoCuidados | null> {
    // Um id malformado faria o Mongoose lançar CastError (500) em vez de 404.
    if (!isValidObjectId(id)) return null;
    const doc = await this.model.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<PlanoCuidados[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async appendEvolucao(
    clinicaId: string,
    id: string,
    evolucao: EvolucaoPlano,
  ): Promise<PlanoCuidados | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId },
        { $push: { evolucoes: evolucao } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): PlanoCuidados {
    const { _id, updatedAt, createdAt, ...rest } = doc as Record<string, unknown> & {
      _id: { toString(): string };
      updatedAt?: Date;
      createdAt?: Date;
    };
    return {
      id: _id.toString(),
      atualizadoEm: updatedAt ?? (rest.criadoEm as Date),
      ...rest,
    } as unknown as PlanoCuidados;
  }
}
