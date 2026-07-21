/** Item prescrito: `produtoId` presente quando veio do catálogo (curativos/
 * coberturas/adjuvantes); `nome` sempre preenchido, copiado do catálogo ou
 * digitado livre (insumo fora do catálogo). */
export interface ItemReceituario {
  produtoId?: string;
  nome: string;
  quantidade: number;
  instrucoesUso: string;
}

/**
 * Receituário de enfermagem para insumos ligados ao curativo (COFEN permite
 * enfermeiro prescrever insumos/curativos dentro de protocolo, diferente de
 * receita médica de medicamento). Sem update/delete: uma receita errada vira
 * uma nova, nunca edita a antiga — mesmo princípio de um talão de papel.
 */
export interface ReceituarioEnfermagem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  feridaId?: string;
  enfermeiroId: string;
  itens: ItemReceituario[];
  observacoes?: string;
  criadoEm: Date;
}
