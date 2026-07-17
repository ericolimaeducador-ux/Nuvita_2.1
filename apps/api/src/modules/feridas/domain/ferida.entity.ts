export enum Etiologia {
  PRESSAO = 'pressao',
  PE_DIABETICO = 'pe_diabetico',
  VENOSA = 'venosa',
  ARTERIAL = 'arterial',
  CIRURGICA = 'cirurgica',
  TRAUMATICA = 'traumatica',
  QUEIMADURA = 'queimadura',
  MISTA = 'mista',
  DESCONHECIDA = 'desconhecida',
}

export enum StatusFerida {
  ATIVA = 'ativa',
  CICATRIZADA = 'cicatrizada',
  INATIVA = 'inativa',
}

/**
 * Ao contrário do pipeline de IU (linear/terminal, estado único no paciente),
 * cuidado de feridas é longitudinal/cíclico: um paciente pode ter várias
 * feridas concorrentes, cada uma com seu próprio status ao longo do tempo.
 */
export interface Ferida {
  id: string;
  clinicaId: string;
  pacienteId: string;
  rotulo: string;
  etiologia: Etiologia;
  localizacao: string;
  status: StatusFerida;
  dataInicio?: Date;
  observacoes?: string;
  excluidoEm?: Date;
  excluidoPor?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
