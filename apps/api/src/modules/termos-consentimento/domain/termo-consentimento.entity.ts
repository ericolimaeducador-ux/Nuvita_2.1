export enum TipoTermo {
  FOTOGRAFIA_PESQUISA = 'fotografia_pesquisa',
}

/**
 * Versão do texto vigente por tipo de termo — persistida em cada assinatura
 * (não no termo em si) para que uma mudança futura no texto legal nunca
 * altere retroativamente o que já foi assinado (mesmo racional do
 * ESCALAS_VERSION persistido por avaliação de ferida).
 */
export const VERSAO_TEXTO_TERMO: Record<TipoTermo, string> = {
  [TipoTermo.FOTOGRAFIA_PESQUISA]: 'fotografia-pesquisa-1.0.0',
};

export const TEXTO_TERMO: Record<TipoTermo, string> = {
  [TipoTermo.FOTOGRAFIA_PESQUISA]: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO — FOTOGRAFIA DE LESÃO E USO EM PESQUISA CIENTÍFICA

Eu, paciente (ou responsável legal) desta clínica de estomaterapia, declaro que fui informado(a) de forma clara sobre os seguintes pontos e que concordo livremente com eles:

1. Serão realizadas fotografias da(s) minha(s) lesão(ões) como parte do acompanhamento clínico do meu tratamento, permitindo o registro objetivo da evolução da ferida ao longo do tempo.

2. As fotografias e os dados clínicos associados (idade, etiologia da lesão, características da ferida e evolução do tratamento) poderão ser utilizados, de forma anonimizada, em estudos científicos, publicações acadêmicas, apresentações em congressos ou materiais de ensino, sem que meu nome ou qualquer outro dado que permita minha identificação direta seja divulgado.

3. Este consentimento não é obrigatório para meu atendimento — a recusa em autorizar o uso das imagens para fins de pesquisa não implica em qualquer prejuízo ao meu tratamento clínico.

4. Posso revogar esta autorização a qualquer momento, mediante solicitação por escrito à clínica, sem que isso afete meu acompanhamento em curso.

5. As fotografias serão armazenadas de forma segura, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), com acesso restrito à equipe assistencial responsável pelo meu tratamento.

Ao confirmar minha identidade digitando meu nome completo, declaro que li e compreendi as informações acima e que autorizo, de forma livre e esclarecida, a fotografia da(s) minha(s) lesão(ões) e o uso dos dados nos termos descritos.`,
};

export interface AssinaturaTermo {
  nomeAssinante: string;
  dataAssinatura: Date;
  hash: string;
  /** Usuário (profissional/secretaria) que operou a tela no momento da assinatura. */
  assinadoPor: string;
}

/**
 * Termo de consentimento assinado digitalmente — mesmo padrão do prontuário
 * (HMAC server-side, imutável após assinado). Uma vez assinado, nunca é
 * reaberto: se o paciente mudar de ideia, um novo termo é criado.
 */
export interface TermoConsentimento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  tipo: TipoTermo;
  versaoTexto: string;
  assinatura?: AssinaturaTermo;
  criadoPor: string;
  criadoEm: Date;
}
