import Anthropic from '@anthropic-ai/sdk';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MODELO_IA_PADRAO } from '../plano-cuidados.constants';
import { RegistroAuditoriaIa } from '../domain/plano-cuidados.entity';
import {
  SKILL_01_EXTRACAO,
  SKILL_02_DIAGNOSTICOS,
  SKILL_03_RESULTADOS,
  SKILL_04_PRESCRICOES,
  SKILL_05_EVOLUCAO,
  SKILL_06_ANALISE_FOTO,
} from './plano-cuidados-skills.constants';

export interface ResultadoSkill<T = Record<string, unknown>> {
  resultado: T;
  auditoria: RegistroAuditoriaIa;
}

/**
 * Motor de raciocínio clínico do plano de cuidados.
 *
 * Ponto de atenção de LGPD: este é o único lugar do backend que envia dado
 * pessoal sensível (art. 5º, II — saúde) para fora. O texto de histórico e
 * exame físico sai da infraestrutura para a API da Anthropic. Isso é
 * transferência internacional de dado de saúde e precisa de base legal
 * registrada. O serviço fica atrás da interface do módulo justamente para que
 * essa decisão seja reversível sem reescrever os use cases.
 */
@Injectable()
export class PlanoCuidadosAiService {
  private readonly logger = new Logger(PlanoCuidadosAiService.name);
  private readonly modelo: string;
  private client?: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.modelo = this.config.get<string>('CIPE_AI_MODEL') ?? MODELO_IA_PADRAO;
  }

  /**
   * Cliente preguiçoso: a chave é opcional no boot. Sem isto, uma instância sem
   * `ANTHROPIC_API_KEY` derrubaria a API inteira no start por causa de um
   * módulo que talvez nem seja usado — o resto do sistema não depende de IA.
   */
  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Motor de raciocínio clínico não configurado nesta instalação (ANTHROPIC_API_KEY ausente).',
      );
    }
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  private async chamar<T>(
    skill: string,
    system: string,
    conteudo: string,
    maxTokens: number,
  ): Promise<ResultadoSkill<T>> {
    const client = this.getClient();

    let resposta: Anthropic.Message;
    try {
      resposta = await client.messages.create({
        model: this.modelo,
        max_tokens: maxTokens,
        system,
        // Raciocínio clínico se beneficia de deliberação; adaptive deixa o
        // modelo calibrar a profundidade por caso em vez de gastar igual em
        // todos.
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: conteudo }],
      });
    } catch (erro) {
      // Cadeia do mais específico para o mais geral — 429 e 5xx são
      // transitórios e merecem mensagem diferente de erro de requisição.
      if (erro instanceof Anthropic.RateLimitError) {
        this.logger.warn({ evento: 'ia_rate_limit', skill });
        throw new ServiceUnavailableException(
          'Motor de raciocínio clínico com limite de uso atingido. Tente novamente em instantes.',
        );
      }
      if (erro instanceof Anthropic.AuthenticationError) {
        this.logger.error({ evento: 'ia_auth_invalida', skill });
        throw new ServiceUnavailableException(
          'Motor de raciocínio clínico com credencial inválida. Avise o administrador.',
        );
      }
      if (erro instanceof Anthropic.APIError) {
        this.logger.error({ evento: 'ia_api_error', skill, status: erro.status });
        throw new ServiceUnavailableException(
          'Motor de raciocínio clínico temporariamente indisponível. Tente novamente em instantes.',
        );
      }
      this.logger.error({ evento: 'ia_erro_inesperado', skill }, erro as Error);
      throw new ServiceUnavailableException(
        'Falha inesperada no motor de raciocínio clínico.',
      );
    }

    const auditoria: RegistroAuditoriaIa = {
      skill,
      modelo: this.modelo,
      tokensEntrada: resposta.usage.input_tokens,
      tokensSaida: resposta.usage.output_tokens,
      em: new Date(),
    };

    this.logger.log({
      evento: 'ia_chamada',
      skill,
      modelo: this.modelo,
      tokensEntrada: auditoria.tokensEntrada,
      tokensSaida: auditoria.tokensSaida,
      stopReason: resposta.stop_reason,
    });

    if (resposta.stop_reason === 'refusal') {
      throw new UnprocessableEntityException(
        'O motor de raciocínio clínico recusou processar este conteúdo. Revise o texto informado.',
      );
    }

    // Truncar no meio do JSON gera um parse quebrado com causa não óbvia; vale
    // avisar com precisão em vez de deixar cair no catch genérico.
    if (resposta.stop_reason === 'max_tokens') {
      throw new UnprocessableEntityException(
        `Resposta do motor clínico excedeu o limite na etapa "${skill}". Reduza o texto informado e tente novamente.`,
      );
    }

    return { resultado: this.extrairJson<T>(resposta, skill), auditoria };
  }

  /**
   * Com adaptive thinking ligado, `content[0]` pode ser um bloco `thinking` — o
   * texto não está necessariamente na primeira posição. Daí a busca pelo bloco.
   */
  private extrairJson<T>(resposta: Anthropic.Message, skill: string): T {
    const blocoTexto = resposta.content.find(
      (bloco): bloco is Anthropic.TextBlock => bloco.type === 'text',
    );

    if (!blocoTexto) {
      throw new UnprocessableEntityException(
        `Motor clínico não retornou conteúdo na etapa "${skill}".`,
      );
    }

    const bruto = blocoTexto.text.trim();
    // Apesar da instrução, modelos ocasionalmente embrulham em cerca de código.
    const semCerca = bruto
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(semCerca) as T;
    } catch {
      this.logger.error({ evento: 'ia_json_invalido', skill, amostra: semCerca.slice(0, 400) });
      throw new UnprocessableEntityException(
        `Motor clínico retornou resposta fora do formato esperado na etapa "${skill}".`,
      );
    }
  }

  // maxTokens generoso de propósito: com thinking adaptive, o "pensamento" do
  // modelo consome do mesmo orçamento do max_tokens (não há budget_tokens
  // separado nesse modo) — um caso mais complexo pode gastar o limite inteiro
  // só pensando e cortar o JSON de resposta no meio (stop_reason max_tokens).
  // Visto em produção em 2026-07-23 com o limite antigo de 4000.
  extrairDadosClinicos(textoLivre: string) {
    return this.chamar<Record<string, unknown>>('extracao', SKILL_01_EXTRACAO, textoLivre, 16000);
  }

  gerarDiagnosticos(dadosEstruturados: unknown, fenomenosCandidatos: unknown[]) {
    return this.chamar<{ diagnosticos: Record<string, unknown>[] }>(
      'diagnosticos',
      SKILL_02_DIAGNOSTICOS,
      JSON.stringify({ dadosEstruturados, fenomenosCandidatos }, null, 2),
      16000,
    );
  }

  gerarResultados(diagnosticos: unknown[], resultadosDisponiveis: unknown[]) {
    return this.chamar<{ planoResultados: Record<string, unknown>[] }>(
      'resultados',
      SKILL_03_RESULTADOS,
      JSON.stringify({ diagnosticos, resultadosDisponiveis }, null, 2),
      16000,
    );
  }

  gerarPrescricoes(
    diagnosticos: unknown[],
    resultados: unknown[],
    acoesDisponiveis: unknown[],
    contextoClinico: unknown,
  ) {
    return this.chamar<{ prescricoes: Record<string, unknown>[] }>(
      'prescricoes',
      SKILL_04_PRESCRICOES,
      JSON.stringify({ diagnosticos, resultados, acoesDisponiveis, contextoClinico }, null, 2),
      20000,
    );
  }

  reavaliarPlano(planoOriginal: unknown, relatoEvolucao: string, avaliacaoAtual: unknown) {
    return this.chamar<Record<string, unknown>>(
      'evolucao',
      SKILL_05_EVOLUCAO,
      JSON.stringify({ planoOriginal, relatoEvolucao, avaliacaoAtual }, null, 2),
      16000,
    );
  }

  /**
   * Análise auxiliar de foto de ferida.
   *
   * Pré-preenche o formulário de avaliação; NÃO substitui o exame do
   * enfermeiro. Por isso o retorno carrega `exigeRevisaoHumana: true` e
   * `confianca`, honrando o contrato já definido em
   * `feridas/domain/ia-contracts.entity.ts` — o formato foi decidido lá e não
   * se inventa um paralelo aqui.
   *
   * Atenção LGPD: imagem de lesão corporal é dado de saúde identificável. Vale
   * a mesma exigência de base legal do texto clínico, com agravante de ser
   * imagem — e o TCLE de fotografia já existente precisa cobrir o envio a
   * terceiro.
   */
  async analisarFotoFerida(
    imagemBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  ): Promise<ResultadoSkill<Record<string, unknown>>> {
    const client = this.getClient();
    const skill = 'analise_foto';

    let resposta: Anthropic.Message;
    try {
      resposta = await client.messages.create({
        model: this.modelo,
        max_tokens: 2000,
        system: SKILL_06_ANALISE_FOTO,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imagemBase64 } },
              { type: 'text', text: 'Analise esta foto de ferida e retorne o JSON especificado.' },
            ],
          },
        ],
      });
    } catch (erro) {
      if (erro instanceof Anthropic.APIError) {
        this.logger.error({ evento: 'ia_api_error', skill, status: erro.status });
        throw new ServiceUnavailableException(
          'Análise de imagem temporariamente indisponível. Tente novamente em instantes.',
        );
      }
      throw new ServiceUnavailableException('Falha inesperada na análise de imagem.');
    }

    const auditoria: RegistroAuditoriaIa = {
      skill,
      modelo: this.modelo,
      tokensEntrada: resposta.usage.input_tokens,
      tokensSaida: resposta.usage.output_tokens,
      em: new Date(),
    };

    if (resposta.stop_reason === 'refusal') {
      throw new UnprocessableEntityException('A análise desta imagem foi recusada.');
    }

    const bruto = this.extrairJson<Record<string, unknown>>(resposta, skill);
    // Nunca sai daqui sem a marca de revisão obrigatória, independentemente do
    // que o modelo tenha devolvido.
    return { resultado: { ...bruto, exigeRevisaoHumana: true }, auditoria };
  }
}
