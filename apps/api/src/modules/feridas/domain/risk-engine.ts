import { Etiologia } from './ferida.entity';
import {
  AchadoPerilesional,
  Medicao,
  NivelExsudato,
  NivelRisco,
  PerfilTecidual,
  RecomendacaoClinica,
} from './avaliacao-ferida.entity';

/** Persistida em toda avaliação — permite auditar qual versão da lógica gerou uma recomendação passada mesmo depois de a regra evoluir. */
export const ENGINE_VERSION = 'clinical-rules-0.1.0';

/**
 * Entrada do motor de risco: une o dado que vive em `Ferida` (etiologia, fixo
 * por ferida) com os dados coletados na avaliação atual. Porte exato de
 * `WoundAssessment` (woundcare-ai/src/woundcare_ai/clinical/models.py), sem
 * os campos que não são consumidos por nenhuma regra (`patient_id`,
 * `wound_id`, `diabetes` — este último nunca é lido pelo motor, só a
 * etiologia importa para a regra de pé diabético).
 */
export interface AvaliarRiscoInput {
  etiologia: Etiologia;
  medicao: Medicao;
  tecido: PerfilTecidual;
  exsudato: NivelExsudato;
  escalaDor: number;
  odor: boolean;
  achadosPerilesionais: AchadoPerilesional[];
  sinaisSistemicos: boolean;
  perfusaoRuim: boolean;
  ossoOuTendaoExposto: boolean;
  pioraAreaPct30Dias?: number;
  diasCicatrizacaoEstagnada?: number;
}

const ACHADOS_INFECCAO = new Set<AchadoPerilesional>([
  AchadoPerilesional.ERITEMA,
  AchadoPerilesional.CALOR,
  AchadoPerilesional.EDEMA,
  AchadoPerilesional.INDURACAO,
  AchadoPerilesional.CREPITACAO,
]);

function contaSinaisDeInfeccao(input: AvaliarRiscoInput): number {
  let score = 0;
  for (const achado of input.achadosPerilesionais) {
    if (ACHADOS_INFECCAO.has(achado)) score += 1;
  }
  if (input.odor) score += 1;
  if (input.exsudato === NivelExsudato.ALTO) score += 1;
  return score;
}

/**
 * Porte exato de `assess_wound_risk` (risk_engine.py): mesmas 8 regras + 1
 * fallback, na mesma ordem, `regraId` mantido em inglês (rastreabilidade
 * regulatória entre o protótipo Python e o produto TS). Função pura, sem
 * I/O, sem decorators — testável isoladamente (ver risk-engine.spec.ts).
 */
export function avaliarRiscoFerida(input: AvaliarRiscoInput): RecomendacaoClinica[] {
  const recomendacoes: RecomendacaoClinica[] = [];

  if (input.sinaisSistemicos) {
    recomendacoes.push({
      risco: NivelRisco.URGENTE,
      titulo: 'Sinais sistêmicos presentes',
      justificativa:
        'Febre, mal-estar, instabilidade ou outros sinais sistêmicos podem indicar infecção grave ou sepse.',
      acao: 'Orientar avaliação presencial urgente conforme protocolo local.',
      regraId: 'URGENT_SYSTEMIC_SIGNS',
      exigeRevisaoHumana: true,
    });
  }

  if (
    input.perfusaoRuim &&
    (input.escalaDor >= 7 || input.etiologia === Etiologia.ARTERIAL || input.etiologia === Etiologia.MISTA)
  ) {
    recomendacoes.push({
      risco: NivelRisco.URGENTE,
      titulo: 'Suspeita de comprometimento vascular relevante',
      justificativa:
        'Perfusão ruim associada a dor intensa ou etiologia arterial aumenta risco de isquemia crítica.',
      acao: 'Acionar avaliação vascular urgente antes de condutas compressivas ou desbridamento extensivo.',
      regraId: 'URGENT_PERFUSION',
      exigeRevisaoHumana: true,
    });
  }

  const infectionScore = contaSinaisDeInfeccao(input);

  if (infectionScore >= 3) {
    recomendacoes.push({
      risco: NivelRisco.ALTO,
      titulo: 'Sinais locais sugestivos de infecção',
      justificativa:
        'Combinação de eritema, calor, edema, odor, induração ou exsudato alto aumenta suspeita de infecção local.',
      acao:
        'Recomendar revisão clínica, limpeza/desbridamento quando indicado e avaliação de necessidade de cultura ou terapia antimicrobiana.',
      regraId: 'HIGH_LOCAL_INFECTION',
      exigeRevisaoHumana: true,
    });
  }

  if (input.tecido.necrosePct >= 25) {
    recomendacoes.push({
      risco: NivelRisco.ALTO,
      titulo: 'Necrose relevante',
      justificativa: 'Necrose extensa pode atrasar cicatrização e ocultar infecção ou isquemia.',
      acao:
        'Avaliar perfusão, dor, infecção e possibilidade de desbridamento conforme competência profissional e protocolo.',
      regraId: 'HIGH_NECROSIS',
      exigeRevisaoHumana: true,
    });
  }

  if (
    input.etiologia === Etiologia.PE_DIABETICO &&
    (input.perfusaoRuim || input.ossoOuTendaoExposto || infectionScore >= 2)
  ) {
    recomendacoes.push({
      risco: NivelRisco.ALTO,
      titulo: 'Pé diabético com fator de alto risco',
      justificativa:
        'Diabetes associado a perfusão ruim, infecção suspeita ou estrutura profunda exposta aumenta risco de amputação.',
      acao: 'Priorizar avaliação multiprofissional, descarga/offloading e investigação vascular/infecciosa.',
      regraId: 'HIGH_DIABETIC_FOOT',
      exigeRevisaoHumana: true,
    });
  }

  if (input.pioraAreaPct30Dias !== undefined && input.pioraAreaPct30Dias >= 20) {
    recomendacoes.push({
      risco: NivelRisco.MODERADO,
      titulo: 'Aumento de área em seguimento',
      justificativa:
        'Aumento de área no período recente sugere deterioração, adesão insuficiente ou etiologia não controlada.',
      acao: 'Revisar plano de cuidado, pressão/carga, perfusão, infecção, técnica de curativo e fatores sociais.',
      regraId: 'MODERATE_AREA_WORSENING',
      exigeRevisaoHumana: true,
    });
  }

  if (input.diasCicatrizacaoEstagnada !== undefined && input.diasCicatrizacaoEstagnada >= 28) {
    recomendacoes.push({
      risco: NivelRisco.MODERADO,
      titulo: 'Cicatrização estagnada',
      justificativa:
        'Ausência de progresso por 4 semanas exige revisão de etiologia, perfusão, infecção e plano terapêutico.',
      acao: 'Gerar alerta para reavaliação estruturada e possível escalonamento do cuidado.',
      regraId: 'MODERATE_STALLED_HEALING',
      exigeRevisaoHumana: true,
    });
  }

  if (input.etiologia === Etiologia.VENOSA && !input.perfusaoRuim) {
    recomendacoes.push({
      risco: NivelRisco.BAIXO,
      titulo: 'Ferida venosa sem alerta vascular informado',
      justificativa:
        'Em úlceras venosas, compressão pode ser parte central do cuidado quando perfusão adequada e protocolo institucional permite.',
      acao: 'Sugerir checagem de elegibilidade para terapia compressiva conforme avaliação profissional.',
      regraId: 'LOW_VENOUS_COMPRESSION_CHECK',
      exigeRevisaoHumana: true,
    });
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push({
      risco: NivelRisco.BAIXO,
      titulo: 'Sem alerta clínico maior no registro atual',
      justificativa: 'Os dados informados não acionaram regras de urgência, alto risco ou risco moderado.',
      acao: 'Manter monitorização, comparação fotográfica e reavaliação conforme plano de cuidado.',
      regraId: 'LOW_NO_MAJOR_ALERT',
      exigeRevisaoHumana: true,
    });
  }

  return recomendacoes.sort((a, b) => rankRisco(b.risco) - rankRisco(a.risco));
}

function rankRisco(risco: NivelRisco): number {
  switch (risco) {
    case NivelRisco.BAIXO:
      return 1;
    case NivelRisco.MODERADO:
      return 2;
    case NivelRisco.ALTO:
      return 3;
    case NivelRisco.URGENTE:
      return 4;
  }
}
