import {
  BRADEN_TOTAL_MAXIMO,
  BRADEN_TOTAL_MINIMO,
  BRADEN_VERSION,
  BradenAtividade,
  BradenFriccaoCisalhamento,
  BradenMobilidade,
  BradenNutricao,
  BradenPercepcaoSensorial,
  BradenSubescalas,
  BradenUmidade,
  NivelRiscoBraden,
  bradenCompleto,
  calcularBraden,
  classificarRiscoBraden,
} from './braden';

const piorCaso: BradenSubescalas = {
  percepcaoSensorial: BradenPercepcaoSensorial.TOTALMENTE_LIMITADO,
  umidade: BradenUmidade.COMPLETAMENTE_MOLHADO,
  atividade: BradenAtividade.ACAMADO,
  mobilidade: BradenMobilidade.TOTALMENTE_IMOVEL,
  nutricao: BradenNutricao.MUITO_POBRE,
  friccaoCisalhamento: BradenFriccaoCisalhamento.PROBLEMA,
};

const melhorCaso: BradenSubescalas = {
  percepcaoSensorial: BradenPercepcaoSensorial.NENHUMA_LIMITACAO,
  umidade: BradenUmidade.RARAMENTE_MOLHADO,
  atividade: BradenAtividade.ANDA_FREQUENTEMENTE,
  mobilidade: BradenMobilidade.NAO_APRESENTA_LIMITACOES,
  nutricao: BradenNutricao.EXCELENTE,
  friccaoCisalhamento: BradenFriccaoCisalhamento.NENHUM_PROBLEMA,
};

describe('calcularBraden — limites do instrumento', () => {
  it('pior caso possível soma 6', () => {
    expect(calcularBraden(piorCaso)!.total).toBe(BRADEN_TOTAL_MINIMO);
  });

  it('melhor caso possível soma 23', () => {
    expect(calcularBraden(melhorCaso)!.total).toBe(BRADEN_TOTAL_MAXIMO);
  });

  it('fricção e cisalhamento tem só 3 níveis — é o que faz o máximo ser 23 e não 24', () => {
    expect(BradenFriccaoCisalhamento.NENHUM_PROBLEMA).toBe(3);
    expect(calcularBraden(melhorCaso)!.total).toBe(23);
  });

  it('persiste a versão para manter escore antigo auditável', () => {
    const r = calcularBraden(piorCaso)!;
    expect(r.versao).toBe(BRADEN_VERSION);
    expect(r.faixasPendentesConfirmacao).toBe(true);
  });
});

describe('calcularBraden — avaliação incompleta', () => {
  it('não calcula com subescala faltando', () => {
    const { nutricao, ...semNutricao } = piorCaso;
    expect(calcularBraden(semNutricao)).toBeUndefined();
    expect(bradenCompleto(semNutricao)).toBe(false);
  });

  it('não calcula com entrada vazia ou indefinida', () => {
    expect(calcularBraden(undefined)).toBeUndefined();
    expect(calcularBraden({})).toBeUndefined();
  });

  it('rejeita valor fora da faixa da subescala', () => {
    expect(calcularBraden({ ...piorCaso, umidade: 9 as BradenUmidade })).toBeUndefined();
    expect(calcularBraden({ ...piorCaso, umidade: 0 as BradenUmidade })).toBeUndefined();
  });

  it('rejeita 4 em fricção, que só vai até 3', () => {
    expect(
      calcularBraden({ ...piorCaso, friccaoCisalhamento: 4 as BradenFriccaoCisalhamento }),
    ).toBeUndefined();
  });

  it('rejeita valor não inteiro', () => {
    expect(calcularBraden({ ...piorCaso, atividade: 2.5 as BradenAtividade })).toBeUndefined();
  });
});

describe('classificarRiscoBraden — faixas nos limites', () => {
  // Menor escore = maior risco, ao contrário de PUSH e RESVECH.
  it.each([
    [6, NivelRiscoBraden.MUITO_ALTO],
    [9, NivelRiscoBraden.MUITO_ALTO],
    [10, NivelRiscoBraden.ALTO],
    [12, NivelRiscoBraden.ALTO],
    [13, NivelRiscoBraden.MODERADO],
    [14, NivelRiscoBraden.MODERADO],
    [15, NivelRiscoBraden.BAIXO],
    [18, NivelRiscoBraden.BAIXO],
    [19, NivelRiscoBraden.SEM_RISCO],
    [23, NivelRiscoBraden.SEM_RISCO],
  ])('total %i classifica como %s', (total, esperado) => {
    expect(classificarRiscoBraden(total)).toBe(esperado);
  });

  it('pior caso é risco muito alto e melhor caso é sem risco', () => {
    expect(calcularBraden(piorCaso)!.risco).toBe(NivelRiscoBraden.MUITO_ALTO);
    expect(calcularBraden(melhorCaso)!.risco).toBe(NivelRiscoBraden.SEM_RISCO);
  });
});
