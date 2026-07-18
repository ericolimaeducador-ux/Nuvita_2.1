import { AchadoPerilesional, NivelExsudato } from './avaliacao-ferida.entity';
import {
  BordasFerida,
  calcularPush,
  calcularResvech,
  SinalInfeccaoResvech,
  TecidosAfetados,
} from './escalas';

const medicao = (comprimentoCm: number, larguraCm: number, areaCm2?: number) => ({
  comprimentoCm,
  larguraCm,
  profundidadeCm: 0.5,
  areaCm2,
});

const tecido = (granulacaoPct = 0, epitelizacaoPct = 0, esfaceloPct = 0, necrosePct = 0) => ({
  granulacaoPct,
  epitelizacaoPct,
  esfaceloPct,
  necrosePct,
});

describe('calcularPush — PUSH 3.0', () => {
  it('pontua a área conforme as faixas oficiais (0-10)', () => {
    const casos: Array<[number, number]> = [
      [0, 0],
      [0.2, 1],
      [0.3, 2],
      [0.6, 2],
      [1.0, 3],
      [2.0, 4],
      [3.0, 5],
      [4.0, 6],
      [8.0, 7],
      [12.0, 8],
      [24.0, 9],
      [24.1, 10],
      [150, 10],
    ];
    for (const [area, esperado] of casos) {
      expect(calcularPush(medicao(1, 1, area), tecido(100), NivelExsudato.NENHUM).area).toBe(esperado);
    }
  });

  it('pontua o pior tecido presente: necrose > esfacelo > granulação > epitelização', () => {
    expect(calcularPush(medicao(2, 2), tecido(50, 30, 10, 10), NivelExsudato.NENHUM).tipoTecido).toBe(4);
    expect(calcularPush(medicao(2, 2), tecido(70, 20, 10), NivelExsudato.NENHUM).tipoTecido).toBe(3);
    expect(calcularPush(medicao(2, 2), tecido(90, 10), NivelExsudato.NENHUM).tipoTecido).toBe(2);
    expect(calcularPush(medicao(2, 2), tecido(0, 100), NivelExsudato.NENHUM).tipoTecido).toBe(1);
  });

  it('ferida fechada (área 0) zera os três itens', () => {
    const score = calcularPush(medicao(0, 0, 0), tecido(0, 100), NivelExsudato.MODERADO);
    expect(score).toEqual({ area: 0, exsudato: 0, tipoTecido: 0, total: 0 });
  });

  it('calcula a área a partir de comprimento × largura quando areaCm2 não veio', () => {
    // 2cm × 1.5cm = 3.0cm² → faixa 5
    expect(calcularPush(medicao(2, 1.5), tecido(100), NivelExsudato.BAIXO).area).toBe(5);
  });

  it('soma os três itens no total (caso da folha oficial)', () => {
    // área 5.2 → 7; exsudato moderado → 2; esfacelo presente → 3; total 12
    const score = calcularPush(medicao(1, 1, 5.2), tecido(60, 0, 40), NivelExsudato.MODERADO);
    expect(score.total).toBe(12);
  });
});

describe('calcularResvech — RESVECH 2.0', () => {
  const base = {
    medicao: medicao(2, 2, 4),
    tecido: tecido(100),
    exsudato: NivelExsudato.BAIXO,
    odor: false,
    achadosPerilesionais: [] as AchadoPerilesional[],
    bordas: BordasFerida.DELIMITADAS,
    tecidosAfetados: TecidosAfetados.SUBCUTANEO,
  };

  it('pontua a dimensão conforme as faixas oficiais (0-6)', () => {
    const casos: Array<[number, number]> = [
      [0, 0],
      [3.9, 1],
      [4, 2],
      [15.9, 2],
      [16, 3],
      [36, 4],
      [64, 5],
      [100, 6],
      [180, 6],
    ];
    for (const [area, esperado] of casos) {
      expect(calcularResvech({ ...base, medicao: medicao(1, 1, area) }).dimensao).toBe(esperado);
    }
  });

  it('mapeia bordas e tecidos afetados pela ordem clínica dos enums (0-4)', () => {
    expect(calcularResvech({ ...base, bordas: BordasFerida.NAO_DISTINGUIVEIS }).bordas).toBe(0);
    expect(calcularResvech({ ...base, bordas: BordasFerida.ENGROSSADAS }).bordas).toBe(4);
    expect(calcularResvech({ ...base, tecidosAfetados: TecidosAfetados.PELE_INTACTA }).profundidade).toBe(0);
    expect(calcularResvech({ ...base, tecidosAfetados: TecidosAfetados.OSSO_ANEXOS }).profundidade).toBe(4);
  });

  it('deriva sinais de infecção dos campos existentes e soma a checklist própria', () => {
    const score = calcularResvech({
      ...base,
      odor: true,
      exsudato: NivelExsudato.ALTO,
      achadosPerilesionais: [AchadoPerilesional.ERITEMA, AchadoPerilesional.EDEMA, AchadoPerilesional.CALOR],
      diasCicatrizacaoEstagnada: 30,
      pioraAreaPct30Dias: 10,
      sinaisInfeccao: [SinalInfeccaoResvech.EXSUDATO_PURULENTO, SinalInfeccaoResvech.TECIDO_FRIAVEL],
    });
    // 7 derivados (eritema, edema, calor, odor, exsudato alto, estagnada, área aumentou) + 2 da checklist
    expect(score.infeccaoInflamacao).toBe(9);
  });

  it('estagnação só conta a partir de 28 dias (mesmo limiar do motor de risco)', () => {
    expect(calcularResvech({ ...base, diasCicatrizacaoEstagnada: 27 }).infeccaoInflamacao).toBe(0);
    expect(calcularResvech({ ...base, diasCicatrizacaoEstagnada: 28 }).infeccaoInflamacao).toBe(1);
  });

  it('soma os seis itens no total', () => {
    // dimensão 4cm²→2; subcutâneo→2; delimitadas→2; granulação→2; exsudato baixo→1; sem sinais→0
    expect(calcularResvech(base).total).toBe(9);
  });

  it('ferida cicatrizada pontua 0 em dimensão, leito e exsudato', () => {
    const score = calcularResvech({
      ...base,
      medicao: medicao(0, 0, 0),
      tecido: tecido(),
      bordas: BordasFerida.NAO_DISTINGUIVEIS,
      tecidosAfetados: TecidosAfetados.PELE_INTACTA,
    });
    expect(score.total).toBe(0);
  });
});
