import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CatalogoClinicoRepository } from '../../application/ports/catalogo-clinico.repository';
import {
  CatalogoAcao,
  CatalogoFenomeno,
  CatalogoResultado,
  ContextoEstomaterapia,
  TipoTermoCatalogo,
} from '../../domain/catalogo-clinico.entity';
import {
  CatalogoAcaoDocument,
  CatalogoAcaoMongo,
  CatalogoFenomenoDocument,
  CatalogoFenomenoMongo,
  CatalogoResultadoDocument,
  CatalogoResultadoMongo,
} from './catalogo.schema';

@Injectable()
export class CatalogoMongoRepository implements CatalogoClinicoRepository {
  constructor(
    @InjectModel(CatalogoFenomenoMongo.name)
    private readonly fenomenoModel: Model<CatalogoFenomenoDocument>,
    @InjectModel(CatalogoAcaoMongo.name)
    private readonly acaoModel: Model<CatalogoAcaoDocument>,
    @InjectModel(CatalogoResultadoMongo.name)
    private readonly resultadoModel: Model<CatalogoResultadoDocument>,
  ) {}

  async buscarFenomenos(
    palavrasChave: string[],
    contexto: ContextoEstomaterapia | undefined,
    limite: number,
  ): Promise<CatalogoFenomeno[]> {
    const termos = palavrasChave.filter((p) => p && p.trim().length > 0);
    if (termos.length === 0) return [];

    const filtro: FilterQuery<CatalogoFenomenoDocument> = { $text: { $search: termos.join(' ') } };
    if (contexto) filtro.contextoEstomaterapia = contexto;

    const docs = await this.fenomenoModel
      .find(filtro, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limite)
      .lean();

    // Com contexto informado, um filtro estreito demais pode zerar o resultado e
    // deixar o modelo sem candidato nenhum. Reamplia sem o contexto antes de
    // devolver vazio — melhor candidato de outro contexto que candidato nenhum.
    if (docs.length === 0 && contexto) {
      const amplo = await this.fenomenoModel
        .find({ $text: { $search: termos.join(' ') } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limite)
        .lean();
      return amplo.map((d) => this.toEntity<CatalogoFenomeno>(d));
    }

    return docs.map((d) => this.toEntity<CatalogoFenomeno>(d));
  }

  async acoesPorFenomenos(codigosFenomenos: string[]): Promise<CatalogoAcao[]> {
    if (codigosFenomenos.length === 0) return [];
    const docs = await this.acaoModel
      .find({ fenomenosVinculados: { $in: codigosFenomenos } })
      .lean();
    return docs.map((d) => this.toEntity<CatalogoAcao>(d));
  }

  async resultadosPorFenomenos(codigosFenomenos: string[]): Promise<CatalogoResultado[]> {
    if (codigosFenomenos.length === 0) return [];
    const docs = await this.resultadoModel
      .find({ fenomenosVinculados: { $in: codigosFenomenos } })
      .lean();
    return docs.map((d) => this.toEntity<CatalogoResultado>(d));
  }

  async buscarTermos(
    query: string,
    tipo: TipoTermoCatalogo,
    limite: number,
  ): Promise<(CatalogoFenomeno | CatalogoAcao | CatalogoResultado)[]> {
    if (!query || query.trim().length === 0) return [];

    // Cada model tem tipo de documento próprio; o union quebra a inferência do
    // Mongoose, então a query roda por ramo em vez de num model "genérico".
    const projecao = { score: { $meta: 'textScore' } } as const;
    const ordem = { score: { $meta: 'textScore' } } as const;
    const filtro = { $text: { $search: query } } as const;

    if (tipo === 'fenomeno') {
      const docs = await this.fenomenoModel.find(filtro, projecao).sort(ordem).limit(limite).lean();
      return docs.map((d) => this.toEntity<CatalogoFenomeno>(d));
    }
    if (tipo === 'acao') {
      const docs = await this.acaoModel.find(filtro, projecao).sort(ordem).limit(limite).lean();
      return docs.map((d) => this.toEntity<CatalogoAcao>(d));
    }
    const docs = await this.resultadoModel.find(filtro, projecao).sort(ordem).limit(limite).lean();
    return docs.map((d) => this.toEntity<CatalogoResultado>(d));
  }

  private toEntity<T>(doc: Record<string, unknown>): T {
    const { _id, score: _score, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = doc as Record<string, unknown> & {
      _id: { toString(): string };
    };
    return { id: _id.toString(), ...rest } as T;
  }
}
