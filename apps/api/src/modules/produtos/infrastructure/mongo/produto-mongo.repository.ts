import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateProdutoInput,
  ProdutoRepository,
  UpdateProdutoInput,
} from '../../application/ports/produto.repository';
import { Produto, TipoProduto } from '../../domain/produto.entity';
import { ProdutoDocument, ProdutoMongo } from './produto.schema';

@Injectable()
export class ProdutoMongoRepository implements ProdutoRepository {
  constructor(@InjectModel(ProdutoMongo.name) private readonly model: Model<ProdutoDocument>) {}

  async findById(clinicaId: string, id: string): Promise<Produto | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(clinicaId: string, tipo?: TipoProduto, apenasAtivos = true): Promise<Produto[]> {
    const filter: Record<string, unknown> = { clinicaId };
    if (tipo) filter['tipo'] = tipo;
    if (apenasAtivos) filter['ativo'] = true;

    const docs = await this.model.find(filter).sort({ nome: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(data: CreateProdutoInput): Promise<Produto> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async update(clinicaId: string, id: string, data: UpdateProdutoInput): Promise<Produto | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(id) },
        { $set: { ...data, atualizadoEm: new Date() } },
        { new: true, lean: true },
      )
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  async desativar(clinicaId: string, id: string): Promise<Produto | null> {
    return this.update(clinicaId, id, { ativo: false });
  }

  private toEntity(doc: Record<string, unknown>): Produto {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as Produto;
  }
}
