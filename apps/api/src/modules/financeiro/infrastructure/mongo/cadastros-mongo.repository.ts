import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateInstituicaoInput,
  CreateRecorrenciaInput,
  CreateServicoInput,
  InstituicaoRepository,
  RecorrenciaRepository,
  ServicoRepository,
  UpdateInstituicaoInput,
  UpdateRecorrenciaInput,
  UpdateServicoInput,
} from '../../application/ports/cadastros.repository';
import { Instituicao } from '../../domain/instituicao.entity';
import { Recorrencia } from '../../domain/recorrencia.entity';
import { Servico } from '../../domain/servico.entity';
import { InstituicaoDocument, InstituicaoMongo } from './instituicao.schema';
import { RecorrenciaDocument, RecorrenciaMongo } from './recorrencia.schema';
import { ServicoDocument, ServicoMongo } from './servico.schema';

/**
 * Os tres cadastros de apoio do financeiro (tabela de precos, clientes
 * institucionais e recorrencias) tem exatamente a mesma forma de CRUD por
 * tenant, por isso ficam juntos: separa-los seria triplicar o mesmo arquivo.
 */

function idValido(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

@Injectable()
export class ServicoMongoRepository implements ServicoRepository {
  constructor(@InjectModel(ServicoMongo.name) private readonly model: Model<ServicoDocument>) {}

  async findById(clinicaId: string, id: string): Promise<Servico | null> {
    if (!idValido(id)) return null;
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(clinicaId: string, apenasAtivos = true): Promise<Servico[]> {
    const filtro: Record<string, unknown> = { clinicaId };
    if (apenasAtivos) filtro.ativo = true;
    const docs = await this.model.find(filtro).sort({ nome: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(input: CreateServicoInput): Promise<Servico> {
    const doc = await this.model.create({ ...input });
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async update(clinicaId: string, id: string, input: UpdateServicoInput): Promise<Servico | null> {
    if (!idValido(id)) return null;
    const doc = await this.model
      .findOneAndUpdate({ clinicaId, _id: new Types.ObjectId(id) }, { $set: input }, { new: true, lean: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): Servico {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as Servico;
  }
}

@Injectable()
export class InstituicaoMongoRepository implements InstituicaoRepository {
  constructor(@InjectModel(InstituicaoMongo.name) private readonly model: Model<InstituicaoDocument>) {}

  async findById(clinicaId: string, id: string): Promise<Instituicao | null> {
    if (!idValido(id)) return null;
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(clinicaId: string, apenasAtivos = true): Promise<Instituicao[]> {
    const filtro: Record<string, unknown> = { clinicaId };
    if (apenasAtivos) filtro.ativo = true;
    const docs = await this.model.find(filtro).sort({ nome: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(input: CreateInstituicaoInput): Promise<Instituicao> {
    const doc = await this.model.create({ ...input });
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async update(clinicaId: string, id: string, input: UpdateInstituicaoInput): Promise<Instituicao | null> {
    if (!idValido(id)) return null;
    const doc = await this.model
      .findOneAndUpdate({ clinicaId, _id: new Types.ObjectId(id) }, { $set: input }, { new: true, lean: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): Instituicao {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as Instituicao;
  }
}

@Injectable()
export class RecorrenciaMongoRepository implements RecorrenciaRepository {
  constructor(@InjectModel(RecorrenciaMongo.name) private readonly model: Model<RecorrenciaDocument>) {}

  async findById(clinicaId: string, id: string): Promise<Recorrencia | null> {
    if (!idValido(id)) return null;
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(clinicaId: string, apenasAtivas = false): Promise<Recorrencia[]> {
    const filtro: Record<string, unknown> = { clinicaId };
    if (apenasAtivas) filtro.ativo = true;
    const docs = await this.model.find(filtro).sort({ descricao: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(input: CreateRecorrenciaInput): Promise<Recorrencia> {
    const doc = await this.model.create({ ...input });
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async update(clinicaId: string, id: string, input: UpdateRecorrenciaInput): Promise<Recorrencia | null> {
    if (!idValido(id)) return null;
    const doc = await this.model
      .findOneAndUpdate({ clinicaId, _id: new Types.ObjectId(id) }, { $set: input }, { new: true, lean: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): Recorrencia {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as Recorrencia;
  }
}
