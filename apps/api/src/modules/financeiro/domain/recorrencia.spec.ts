import { CategoriaLancamento, TipoLancamento, categoriaCompativelCom } from './lancamento.entity';
import {
  Recorrencia,
  competenciaDe,
  competenciasDevidas,
  vencimentoDaCompetencia,
} from './recorrencia.entity';

function recorrencia(parcial: Partial<Recorrencia> = {}): Recorrencia {
  return {
    id: 'r1',
    clinicaId: 'c1',
    descricao: 'Aluguel da sala',
    tipo: TipoLancamento.DESPESA,
    categoria: CategoriaLancamento.ALUGUEL,
    valorMensal: 2200,
    diaVencimento: 5,
    inicio: new Date(2026, 0, 1),
    ativo: true,
    criadoEm: new Date(2026, 0, 1),
    ...parcial,
  };
}

describe('competenciasDevidas', () => {
  it('gera uma competência por mês do início até a data de referência, inclusive o mês corrente', () => {
    const devidas = competenciasDevidas(recorrencia(), new Date(2026, 3, 20));
    expect(devidas).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
  });

  it('não gera nada no futuro — os meses seguintes ao de referência ficam de fora', () => {
    const devidas = competenciasDevidas(recorrencia(), new Date(2026, 1, 10));
    expect(devidas).toEqual(['2026-01', '2026-02']);
    expect(devidas).not.toContain('2026-03');
  });

  it('para na data final da vigência, mesmo que a referência seja bem depois', () => {
    const devidas = competenciasDevidas(
      recorrencia({ fim: new Date(2026, 2, 31) }),
      new Date(2026, 8, 1),
    );
    expect(devidas).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('recorrência inativa não deve nada — encerrar para de gerar cobrança', () => {
    expect(competenciasDevidas(recorrencia({ ativo: false }), new Date(2026, 5, 1))).toEqual([]);
  });

  it('início retroativo materializa o histórico inteiro de uma vez', () => {
    const devidas = competenciasDevidas(
      recorrencia({ inicio: new Date(2025, 9, 1) }),
      new Date(2026, 0, 15),
    );
    expect(devidas).toEqual(['2025-10', '2025-11', '2025-12', '2026-01']);
  });

  it('início e referência no mesmo mês geram exatamente uma competência', () => {
    const devidas = competenciasDevidas(
      recorrencia({ inicio: new Date(2026, 4, 20) }),
      new Date(2026, 4, 21),
    );
    expect(devidas).toEqual(['2026-05']);
  });

  it('o dia do mês do início é irrelevante — competência é o mês, não a data', () => {
    const cedo = competenciasDevidas(recorrencia({ inicio: new Date(2026, 0, 1) }), new Date(2026, 1, 5));
    const tarde = competenciasDevidas(recorrencia({ inicio: new Date(2026, 0, 28) }), new Date(2026, 1, 5));
    expect(cedo).toEqual(tarde);
  });

  it('vigência que termina antes de começar não gera nada', () => {
    const devidas = competenciasDevidas(
      recorrencia({ inicio: new Date(2026, 5, 1), fim: new Date(2026, 2, 1) }),
      new Date(2026, 8, 1),
    );
    expect(devidas).toEqual([]);
  });
});

describe('vencimentoDaCompetencia', () => {
  it('usa o dia configurado dentro do mês da competência', () => {
    const vencimento = vencimentoDaCompetencia('2026-03', 10);
    expect(vencimento.getFullYear()).toBe(2026);
    expect(vencimento.getMonth()).toBe(2);
    expect(vencimento.getDate()).toBe(10);
  });

  it('encaixa no último dia válido quando o dia não existe no mês (fevereiro)', () => {
    // O cadastro limita a 28, mas dado legado/externo pode trazer 31.
    expect(vencimentoDaCompetencia('2026-02', 31).getDate()).toBe(28);
    expect(vencimentoDaCompetencia('2026-02', 31).getMonth()).toBe(1);
  });

  it('respeita ano bissexto ao encaixar no último dia', () => {
    expect(vencimentoDaCompetencia('2028-02', 31).getDate()).toBe(29);
  });

  it('nunca produz dia menor que 1', () => {
    expect(vencimentoDaCompetencia('2026-03', 0).getDate()).toBe(1);
  });
});

describe('competenciaDe', () => {
  it('formata com mês de dois dígitos', () => {
    expect(competenciaDe(new Date(2026, 0, 15))).toBe('2026-01');
    expect(competenciaDe(new Date(2026, 11, 1))).toBe('2026-12');
  });
});

describe('categoriaCompativelCom', () => {
  it('aceita as quatro fontes de receita como entrada', () => {
    for (const categoria of [
      CategoriaLancamento.CONSULTA,
      CategoriaLancamento.AVALIACAO_AVULSA,
      CategoriaLancamento.VENDA_PRODUTO,
      CategoriaLancamento.CONSULTORIA,
    ]) {
      expect(categoriaCompativelCom(categoria, TipoLancamento.RECEITA)).toBe(true);
    }
  });

  it('recusa categoria de despesa lançada como receita', () => {
    expect(categoriaCompativelCom(CategoriaLancamento.ALUGUEL, TipoLancamento.RECEITA)).toBe(false);
    expect(categoriaCompativelCom(CategoriaLancamento.INSUMO, TipoLancamento.RECEITA)).toBe(false);
  });

  it('recusa categoria de receita lançada como despesa', () => {
    expect(categoriaCompativelCom(CategoriaLancamento.CONSULTA, TipoLancamento.DESPESA)).toBe(false);
  });

  it('OUTRO serve aos dois lados de propósito', () => {
    expect(categoriaCompativelCom(CategoriaLancamento.OUTRO, TipoLancamento.RECEITA)).toBe(true);
    expect(categoriaCompativelCom(CategoriaLancamento.OUTRO, TipoLancamento.DESPESA)).toBe(true);
  });
});
