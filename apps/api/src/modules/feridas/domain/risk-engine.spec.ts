import { Etiologia } from './ferida.entity';
import { AchadoPerilesional, NivelExsudato, NivelRisco } from './avaliacao-ferida.entity';
import { AvaliarRiscoInput, avaliarRiscoFerida } from './risk-engine';

/** Porte 1:1 de tests/test_risk_engine.py (woundcare-ai) — uma regra por teste + fallback + ordenação. */

function baseInput(overrides: Partial<AvaliarRiscoInput> = {}): AvaliarRiscoInput {
  return {
    etiologia: Etiologia.DESCONHECIDA,
    medicao: { comprimentoCm: 1, larguraCm: 1, profundidadeCm: 0 },
    tecido: { granulacaoPct: 90, epitelizacaoPct: 10, esfaceloPct: 0, necrosePct: 0 },
    exsudato: NivelExsudato.NENHUM,
    escalaDor: 0,
    odor: false,
    achadosPerilesionais: [],
    sinaisSistemicos: false,
    perfusaoRuim: false,
    ossoOuTendaoExposto: false,
    ...overrides,
  };
}

describe('avaliarRiscoFerida', () => {
  it('sinais sistêmicos geram recomendação urgente', () => {
    const recomendacoes = avaliarRiscoFerida(baseInput({ sinaisSistemicos: true }));

    expect(recomendacoes[0].risco).toBe(NivelRisco.URGENTE);
    expect(recomendacoes[0].regraId).toBe('URGENT_SYSTEMIC_SIGNS');
  });

  it('perfusão ruim + dor intensa (>=7) é urgente', () => {
    const recomendacoes = avaliarRiscoFerida(baseInput({ perfusaoRuim: true, escalaDor: 8 }));

    expect(recomendacoes.some((r) => r.regraId === 'URGENT_PERFUSION')).toBe(true);
    expect(recomendacoes[0].risco).toBe(NivelRisco.URGENTE);
  });

  it('perfusão ruim + etiologia arterial (mesmo com dor baixa) é urgente', () => {
    const recomendacoes = avaliarRiscoFerida(
      baseInput({ perfusaoRuim: true, escalaDor: 0, etiologia: Etiologia.ARTERIAL }),
    );

    expect(recomendacoes.some((r) => r.regraId === 'URGENT_PERFUSION')).toBe(true);
  });

  it('3+ sinais de infecção local geram alto risco', () => {
    const recomendacoes = avaliarRiscoFerida(
      baseInput({
        achadosPerilesionais: [AchadoPerilesional.ERITEMA, AchadoPerilesional.CALOR, AchadoPerilesional.EDEMA],
      }),
    );

    expect(recomendacoes.some((r) => r.regraId === 'HIGH_LOCAL_INFECTION')).toBe(true);
  });

  it('necrose >= 25% é alto risco', () => {
    const recomendacoes = avaliarRiscoFerida(
      baseInput({ tecido: { granulacaoPct: 50, epitelizacaoPct: 0, esfaceloPct: 25, necrosePct: 25 } }),
    );

    expect(recomendacoes.some((r) => r.regraId === 'HIGH_NECROSIS')).toBe(true);
  });

  it('pé diabético com infecção e perfusão ruim é alto risco (dispara as duas regras)', () => {
    const recomendacoes = avaliarRiscoFerida(
      baseInput({
        etiologia: Etiologia.PE_DIABETICO,
        perfusaoRuim: true,
        odor: true,
        exsudato: NivelExsudato.ALTO,
        achadosPerilesionais: [AchadoPerilesional.ERITEMA, AchadoPerilesional.CALOR],
      }),
    );
    const regraIds = new Set(recomendacoes.map((r) => r.regraId));

    expect(regraIds.has('HIGH_DIABETIC_FOOT')).toBe(true);
    expect(regraIds.has('HIGH_LOCAL_INFECTION')).toBe(true);
  });

  it('piora de área >= 20% em 30 dias é risco moderado', () => {
    const recomendacoes = avaliarRiscoFerida(baseInput({ pioraAreaPct30Dias: 20 }));

    expect(recomendacoes.some((r) => r.regraId === 'MODERATE_AREA_WORSENING')).toBe(true);
  });

  it('cicatrização estagnada >= 28 dias é risco moderado', () => {
    const recomendacoes = avaliarRiscoFerida(baseInput({ diasCicatrizacaoEstagnada: 28 }));

    expect(recomendacoes.some((r) => r.regraId === 'MODERATE_STALLED_HEALING')).toBe(true);
  });

  it('ferida venosa sem perfusão ruim é baixo risco (sugestão de compressão)', () => {
    const recomendacoes = avaliarRiscoFerida(baseInput({ etiologia: Etiologia.VENOSA, perfusaoRuim: false }));

    expect(recomendacoes.some((r) => r.regraId === 'LOW_VENOUS_COMPRESSION_CHECK')).toBe(true);
  });

  it('fallback de baixo risco quando nenhuma regra dispara', () => {
    const recomendacoes = avaliarRiscoFerida(baseInput());

    expect(recomendacoes).toHaveLength(1);
    expect(recomendacoes[0].risco).toBe(NivelRisco.BAIXO);
    expect(recomendacoes[0].regraId).toBe('LOW_NO_MAJOR_ALERT');
  });

  it('ordena recomendações por risco decrescente quando várias regras disparam', () => {
    const recomendacoes = avaliarRiscoFerida(
      baseInput({
        sinaisSistemicos: true,
        tecido: { granulacaoPct: 50, epitelizacaoPct: 0, esfaceloPct: 25, necrosePct: 25 },
        pioraAreaPct30Dias: 20,
      }),
    );

    const riscos = recomendacoes.map((r) => r.risco);
    expect(riscos).toEqual([NivelRisco.URGENTE, NivelRisco.ALTO, NivelRisco.MODERADO]);
  });

  it('toda recomendação exige revisão humana', () => {
    const recomendacoes = avaliarRiscoFerida(baseInput({ sinaisSistemicos: true }));

    expect(recomendacoes.every((r) => r.exigeRevisaoHumana === true)).toBe(true);
  });
});
