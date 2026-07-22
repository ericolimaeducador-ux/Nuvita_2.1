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
  [TipoTermo.FOTOGRAFIA_PESQUISA]: 'fotografia-pesquisa-1.1.0',
};

export const TEXTO_TERMO: Record<TipoTermo, string> = {
  [TipoTermo.FOTOGRAFIA_PESQUISA]: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO — FOTOGRAFIA DE LESÃO E USO EM PESQUISA CIENTÍFICA

Eu, paciente (ou responsável legal) desta clínica de estomaterapia, declaro ter sido devidamente informado(a) e esclarecido(a) pelo(a) enfermeiro(a) estomaterapeuta responsável pelo meu atendimento (identificado(a) abaixo) sobre a necessidade e os objetivos do registro fotográfico das minhas lesões, e concordo livremente com os pontos a seguir:

1. Objetivo clínico
Serão realizadas fotografias da(s) minha(s) lesão(ões) como parte do acompanhamento do meu tratamento. Essas imagens comporão o meu prontuário eletrônico, documentando a evolução clínica e permitindo a avaliação da cicatrização e a escolha das melhores condutas terapêuticas.

2. Uso científico e educacional
Autorizo, adicionalmente, que estas imagens e os dados clínicos associados (idade, etiologia da lesão, características da ferida e evolução do tratamento) sejam utilizados, de forma anonimizada, em congressos, jornadas, simpósios, publicações em revistas científicas, livros, materiais didáticos e discussão de casos entre profissionais de saúde para fins de aprimoramento técnico.

3. Anonimato e privacidade (LGPD)
Minha identidade será preservada em sigilo em qualquer publicação ou apresentação. As fotografias focarão estritamente a área da lesão, sem meu rosto, tatuagens ou marcas que permitam minha identificação. Meus dados e imagens serão armazenados de forma segura, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), com acesso restrito à equipe assistencial responsável pelo meu tratamento.

4. Voluntariedade e revogação
Este consentimento para uso científico é voluntário e não é condição para meu atendimento — a recusa não implica qualquer prejuízo ao meu tratamento. Posso revogar esta autorização a qualquer momento, mediante solicitação à clínica, sem que isso afete meu acompanhamento em curso.

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
  /** Snapshot do nome/registro (COREN) de quem criou o termo — mesmo
   * racional da versaoTexto: uma alteração futura no cadastro do
   * profissional nunca deve mudar retroativamente o que já foi impresso. */
  criadoPorNome: string;
  criadoPorRegistro?: string;
  criadoEm: Date;
}
