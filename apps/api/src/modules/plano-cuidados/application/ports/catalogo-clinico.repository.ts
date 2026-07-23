import {
  CatalogoAcao,
  CatalogoFenomeno,
  CatalogoResultado,
  ContextoEstomaterapia,
  TipoTermoCatalogo,
} from '../../domain/catalogo-clinico.entity';

export interface CatalogoClinicoRepository {
  buscarFenomenos(
    palavrasChave: string[],
    contexto: ContextoEstomaterapia | undefined,
    limite: number,
  ): Promise<CatalogoFenomeno[]>;

  acoesPorFenomenos(codigosFenomenos: string[]): Promise<CatalogoAcao[]>;

  resultadosPorFenomenos(codigosFenomenos: string[]): Promise<CatalogoResultado[]>;

  /** Busca livre para a tela de seleção manual do enfermeiro. */
  buscarTermos(
    query: string,
    tipo: TipoTermoCatalogo,
    limite: number,
  ): Promise<(CatalogoFenomeno | CatalogoAcao | CatalogoResultado)[]>;
}
