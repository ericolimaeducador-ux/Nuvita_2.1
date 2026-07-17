/**
 * Portas de IA futura — só as *formas*, sem wiring em controller/service.
 * Porte 1:1 das interfaces de woundcare-ai/src/woundcare_ai/ai/contracts.py,
 * mesmo status de stub que têm no protótipo Python. Não implementar lógica
 * aqui; serve para o formato ficar definido quando essas capacidades forem
 * priorizadas (ex.: calibração de medida por régua — ver backlog Fase 7).
 */

export interface ImageQualityResult {
  aceitavel: boolean;
  confianca: number; // 0-1
  problemas: string[];
}

export interface WoundSegmentationResult {
  mascaraUri?: string;
  areaCm2?: number;
  confianca: number; // 0-1
  percentuaisTecido: Record<string, number>;
}

export interface ClinicalNoteDraftResult {
  formato: string; // 'SOAP'
  texto: string;
  confianca: number; // 0-1
  exigeRevisaoHumana: true;
}
