/**
 * Modalidade do atendimento prestado pela clinica. Produto de especialidade
 * unica (estomaterapia): so existe a frente de enfermagem.
 */
export enum ModalidadeAtendimento {
  ENFERMAGEM = 'enfermagem',
}

export const MODALIDADES_ATENDIMENTO = Object.values(ModalidadeAtendimento);

export const ROTULO_MODALIDADE: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.ENFERMAGEM]: 'Atendimento de Enfermagem',
};
