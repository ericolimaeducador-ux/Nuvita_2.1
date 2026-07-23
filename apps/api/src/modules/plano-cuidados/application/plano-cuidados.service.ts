import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../../../common/security/config.service';
import {
  CATALOGO_CLINICO_REPOSITORY,
  MAX_DIAGNOSTICOS_PADRAO,
  MAX_FENOMENOS_CANDIDATOS_PADRAO,
  PLANO_CUIDADOS_REPOSITORY,
} from '../plano-cuidados.constants';
import {
  CATALOGO_CLINICO_VERSAO,
  CatalogoAcao,
  CatalogoFenomeno,
  CatalogoResultado,
  ContextoEstomaterapia,
  TaxonomiaTermo,
  TipoAcao,
  TipoTermoCatalogo,
} from '../domain/catalogo-clinico.entity';
import {
  DecisaoEvolucao,
  DiagnosticoEnfermagem,
  EvolucaoPlano,
  PlanoCuidados,
  Prescricao,
  PrioridadeDiagnostico,
  ResultadoEsperado,
  StatusDiagnostico,
  StatusPlano,
  UrgenciaAcao,
} from '../domain/plano-cuidados.entity';
import { CatalogoClinicoRepository } from './ports/catalogo-clinico.repository';
import { PlanoCuidadosRepository } from './ports/plano-cuidados.repository';
import { GerarPlanoDto } from './dto/gerar-plano.dto';
import { ReavaliarPlanoDto } from './dto/reavaliar-plano.dto';
import { PlanoCuidadosAiService } from './plano-cuidados-ai.service';
import { RegistroAuditoriaIa } from '../domain/plano-cuidados.entity';

@Injectable()
export class PlanoCuidadosService {
  private readonly logger = new Logger(PlanoCuidadosService.name);

  constructor(
    private readonly ai: PlanoCuidadosAiService,
    private readonly config: ConfigService,
    private readonly appConfig: AppConfigService,
    @Inject(PLANO_CUIDADOS_REPOSITORY)
    private readonly planos: PlanoCuidadosRepository,
    @Inject(CATALOGO_CLINICO_REPOSITORY)
    private readonly catalogo: CatalogoClinicoRepository,
  ) {}

  async gerar(
    dto: GerarPlanoDto,
    clinicaId: string,
    enfermeiroId: string,
  ): Promise<PlanoCuidados> {
    const auditoria: RegistroAuditoriaIa[] = [];

    // 1. Extração do texto livre.
    const textoCompleto = [dto.historicoTexto, dto.exameFisicoTexto]
      .filter((t): t is string => Boolean(t))
      .join('\n\n');

    const extracao = await this.ai.extrairDadosClinicos(textoCompleto);
    auditoria.push(extracao.auditoria);
    const dadosEstruturados = extracao.resultado;

    // 2. Busca no catálogo local a partir das palavras-chave extraídas.
    const palavrasChave = Array.isArray(dadosEstruturados.palavrasChaveClinicas)
      ? (dadosEstruturados.palavrasChaveClinicas as unknown[]).filter(
          (p): p is string => typeof p === 'string',
        )
      : [];

    const maxCandidatos = this.numeroDeEnv(
      'CIPE_MAX_FENOMENOS_CANDIDATOS',
      MAX_FENOMENOS_CANDIDATOS_PADRAO,
    );
    const fenomenosCandidatos = await this.catalogo.buscarFenomenos(
      palavrasChave,
      dto.contextoEstomaterapia as ContextoEstomaterapia | undefined,
      maxCandidatos,
    );

    // Catálogo vazio produziria diagnóstico inventado — melhor devolver plano
    // sem diagnóstico e deixar o enfermeiro decidir que o catálogo precisa
    // crescer.
    if (fenomenosCandidatos.length === 0) {
      this.logger.warn({ evento: 'catalogo_sem_candidatos', palavrasChave });
      return this.persistir(dto, clinicaId, enfermeiroId, dadosEstruturados, [], [], [], auditoria);
    }

    // 3. Diagnósticos.
    const diag = await this.ai.gerarDiagnosticos(dadosEstruturados, fenomenosCandidatos);
    auditoria.push(diag.auditoria);

    const maxDiagnosticos = this.numeroDeEnv('CIPE_MAX_DIAGNOSTICOS', MAX_DIAGNOSTICOS_PADRAO);
    const diagnosticos = this.mapearDiagnosticos(
      diag.resultado.diagnosticos ?? [],
      fenomenosCandidatos,
      maxDiagnosticos,
    );

    if (diagnosticos.length === 0) {
      return this.persistir(dto, clinicaId, enfermeiroId, dadosEstruturados, [], [], [], auditoria);
    }

    const codigos = diagnosticos.map((d) => d.codigoFenomeno);

    // 4. Resultados esperados.
    const resultadosDisponiveis = await this.catalogo.resultadosPorFenomenos(codigos);
    let resultadosEsperados: ResultadoEsperado[] = [];
    if (resultadosDisponiveis.length > 0) {
      const res = await this.ai.gerarResultados(diagnosticos, resultadosDisponiveis);
      auditoria.push(res.auditoria);
      resultadosEsperados = this.mapearResultados(
        res.resultado.planoResultados ?? [],
        resultadosDisponiveis,
      );
    }

    // 5. Prescrições.
    const acoesDisponiveis = await this.catalogo.acoesPorFenomenos(codigos);
    let prescricoes: Prescricao[] = [];
    if (acoesDisponiveis.length > 0) {
      const presc = await this.ai.gerarPrescricoes(diagnosticos, resultadosEsperados, acoesDisponiveis, {
        nivelCuidado: dto.nivelCuidado ?? 'ambulatorio',
      });
      auditoria.push(presc.auditoria);
      prescricoes = this.mapearPrescricoes(presc.resultado.prescricoes ?? [], acoesDisponiveis);
    }

    return this.persistir(
      dto,
      clinicaId,
      enfermeiroId,
      dadosEstruturados,
      diagnosticos,
      resultadosEsperados,
      prescricoes,
      auditoria,
    );
  }

  async buscarPorId(id: string, clinicaId: string): Promise<PlanoCuidados> {
    const plano = await this.planos.findById(clinicaId, id);
    if (!plano) throw new NotFoundException('Plano de cuidados não encontrado');
    return plano;
  }

  listarPorPaciente(pacienteId: string, clinicaId: string): Promise<PlanoCuidados[]> {
    return this.planos.listByPaciente(clinicaId, pacienteId);
  }

  buscarTermos(query: string, tipo: TipoTermoCatalogo) {
    return this.catalogo.buscarTermos(query, tipo, 10);
  }

  async evoluir(
    id: string,
    dto: ReavaliarPlanoDto,
    clinicaId: string,
    enfermeiroId: string,
  ): Promise<PlanoCuidados> {
    const plano = await this.buscarPorId(id, clinicaId);

    const reav = await this.ai.reavaliarPlano(
      {
        diagnosticos: plano.diagnosticos,
        resultadosEsperados: plano.resultadosEsperados,
        prescricoes: plano.prescricoes,
        evolucoesAnteriores: plano.evolucoes.length,
      },
      dto.relatoEvolucao,
      dto.avaliacaoAtual ?? {},
    );

    const evolucao = this.mapearEvolucao(reav.resultado, dto.relatoEvolucao, enfermeiroId, plano);

    const atualizado = await this.planos.appendEvolucao(clinicaId, id, evolucao);
    if (!atualizado) throw new NotFoundException('Plano de cuidados não encontrado');
    return atualizado;
  }

  // --- mapeamento e travas -------------------------------------------------

  /**
   * Trava central do módulo: só passa o que existe no catálogo.
   *
   * O prompt manda o modelo não inventar código, mas prompt é instrução, não
   * garantia. Como o diagnóstico vai para registro imutável, a verificação
   * precisa existir em código — um termo alucinado gravado hoje não tem
   * correção depois.
   */
  private mapearDiagnosticos(
    brutos: Record<string, unknown>[],
    candidatos: CatalogoFenomeno[],
    maximo: number,
  ): DiagnosticoEnfermagem[] {
    const porCodigo = new Map(candidatos.map((f) => [f.codigo, f]));

    return brutos
      .filter((d) => {
        const codigo = this.texto(d.codigoFenomeno);
        if (!codigo || !porCodigo.has(codigo)) {
          this.logger.warn({ evento: 'diagnostico_fora_do_catalogo', codigo });
          return false;
        }
        return true;
      })
      .slice(0, maximo)
      .map((d) => {
        const fenomeno = porCodigo.get(this.texto(d.codigoFenomeno))!;
        return {
          prioridade: this.enumOu(d.prioridade, PrioridadeDiagnostico, PrioridadeDiagnostico.MEDIA),
          codigoFenomeno: fenomeno.codigo,
          enunciado: this.texto(d.enunciado) || fenomeno.titulo,
          relacionadoA: this.listaTexto(d.relacionadoA),
          evidenciadoPor: this.listaTexto(d.evidenciadoPor),
          // Na dúvida, hipótese — nunca confirmado por omissão.
          status: this.enumOu(d.status, StatusDiagnostico, StatusDiagnostico.HIPOTESE_PROVISORIA),
          raciocinioClinico: this.texto(d.raciocinioClinico),
          taxonomia: fenomeno.taxonomia ?? TaxonomiaTermo.LOCAL_PROVISORIO,
        };
      });
  }

  private mapearResultados(
    brutos: Record<string, unknown>[],
    disponiveis: CatalogoResultado[],
  ): ResultadoEsperado[] {
    const porCodigo = new Map(disponiveis.map((r) => [r.codigo, r]));
    const saida: ResultadoEsperado[] = [];

    for (const grupo of brutos) {
      const diagnosticoRef = this.texto(grupo.diagnosticoRef);
      const lista = Array.isArray(grupo.resultados)
        ? (grupo.resultados as Record<string, unknown>[])
        : [];

      for (const r of lista) {
        const codigo = this.texto(r.codigo);
        const doCatalogo = porCodigo.get(codigo);
        if (!doCatalogo) {
          this.logger.warn({ evento: 'resultado_fora_do_catalogo', codigo });
          continue;
        }
        saida.push({
          diagnosticoRef,
          codigo: doCatalogo.codigo,
          titulo: this.texto(r.titulo) || doCatalogo.titulo,
          escoreBaseline: this.escore(r.escoreBaseline, 1),
          justificativaBaseline: this.texto(r.justificativaBaseline) || undefined,
          escoreMeta: this.escore(r.escoreMeta, 5),
          prazo: this.texto(r.prazo),
          indicadores: (Array.isArray(r.indicadores) ? r.indicadores : []).map((i) => {
            const ind = i as Record<string, unknown>;
            return {
              descricao: this.texto(ind.descricao),
              valorBaseline: this.texto(ind.valorBaseline),
              valorMeta: this.texto(ind.valorMeta),
              metodoAvaliacao: this.texto(ind.metodoAvaliacao),
              frequencia: this.texto(ind.frequencia),
            };
          }),
          taxonomia: doCatalogo.taxonomia ?? TaxonomiaTermo.LOCAL_PROVISORIO,
        });
      }
    }
    return saida;
  }

  private mapearPrescricoes(
    brutos: Record<string, unknown>[],
    disponiveis: CatalogoAcao[],
  ): Prescricao[] {
    const porCodigo = new Map(disponiveis.map((a) => [a.codigo, a]));

    return brutos.map((p) => ({
      diagnosticoRef: this.texto(p.diagnosticoRef),
      resultadoRef: this.texto(p.resultadoRef),
      acoes: (Array.isArray(p.acoes) ? (p.acoes as Record<string, unknown>[]) : [])
        .filter((a) => {
          const codigo = this.texto(a.codigo);
          if (!porCodigo.has(codigo)) {
            this.logger.warn({ evento: 'acao_fora_do_catalogo', codigo });
            return false;
          }
          return true;
        })
        .map((a) => {
          const doCatalogo = porCodigo.get(this.texto(a.codigo))!;
          return {
            codigo: doCatalogo.codigo,
            titulo: this.texto(a.titulo) || doCatalogo.titulo,
            tipo: this.enumOu(a.tipo, TipoAcao, doCatalogo.tipo ?? TipoAcao.AUTONOMA),
            urgencia: this.enumOu(a.urgencia, UrgenciaAcao, UrgenciaAcao.ROTINA),
            atividades: (Array.isArray(a.atividades) ? a.atividades : []).map((t) => {
              const at = t as Record<string, unknown>;
              return {
                descricao: this.texto(at.descricao),
                frequencia: this.texto(at.frequencia),
                responsavel: this.texto(at.responsavel) || 'Enfermeiro',
                registro: this.texto(at.registro),
              };
            }),
            alertasReavaliacao: this.listaTexto(a.alertasReavaliacao),
            taxonomia: doCatalogo.taxonomia ?? TaxonomiaTermo.LOCAL_PROVISORIO,
          };
        }),
      orientacoesPacienteCuidador: this.listaTexto(p.orientacoesPacienteCuidador),
    }));
  }

  private mapearEvolucao(
    bruto: Record<string, unknown>,
    relatoTexto: string,
    enfermeiroId: string,
    plano: PlanoCuidados,
  ): EvolucaoPlano {
    const codigosValidos = new Set(plano.diagnosticos.map((d) => d.codigoFenomeno));
    const avaliacoes = Array.isArray(bruto.avaliacoes)
      ? (bruto.avaliacoes as Record<string, unknown>[])
      : [];
    const soap = (bruto.textoSoap ?? {}) as Record<string, unknown>;

    return {
      data: new Date(),
      enfermeiroId,
      relatoTexto,
      decisoes: avaliacoes
        // Decisão sobre diagnóstico que não existe no plano não tem o que
        // decidir — descarta em vez de gravar referência órfã.
        .filter((a) => codigosValidos.has(this.texto(a.diagnosticoRef)))
        .map((a) => ({
          diagnosticoRef: this.texto(a.diagnosticoRef),
          decisao: this.enumOu(a.decisao, DecisaoEvolucao, DecisaoEvolucao.A),
          justificativa: this.texto(a.justificativa),
          escoreAnterior: this.escore(a.escoreAnterior, 1),
          escoreAtual: this.escore(a.escoreAtual, 1),
          progressoPct: typeof a.progressoPct === 'number' ? a.progressoPct : undefined,
        })),
      textoSoap: {
        s: this.texto(soap.s),
        o: this.texto(soap.o),
        a: this.texto(soap.a),
        p: this.texto(soap.p),
      },
      novosFenomenos: (Array.isArray(bruto.novosFenomenosIdentificados)
        ? bruto.novosFenomenosIdentificados
        : []
      ).map((n) => {
        const nf = n as Record<string, unknown>;
        return { titulo: this.texto(nf.titulo), justificativa: this.texto(nf.justificativa) };
      }),
    };
  }

  private async persistir(
    dto: GerarPlanoDto,
    clinicaId: string,
    enfermeiroId: string,
    dadosEstruturados: Record<string, unknown>,
    diagnosticos: DiagnosticoEnfermagem[],
    resultadosEsperados: ResultadoEsperado[],
    prescricoes: Prescricao[],
    auditoriaIa: RegistroAuditoriaIa[],
  ): Promise<PlanoCuidados> {
    const base = {
      pacienteId: dto.pacienteId,
      clinicaId,
      enfermeiroId,
      historicoTexto: dto.historicoTexto,
      exameFisicoTexto: dto.exameFisicoTexto,
      nivelCuidado: dto.nivelCuidado,
      avaliacaoFeridaId: dto.avaliacaoFeridaId,
      dadosEstruturados,
      diagnosticos,
      resultadosEsperados,
      prescricoes,
      evolucoes: [],
      status: StatusPlano.ATIVO,
      versaoCatalogo: CATALOGO_CLINICO_VERSAO,
    };

    return this.planos.create({ ...base, hashIntegridade: this.hash(base), auditoriaIa });
  }

  /**
   * Prova de integridade com trilha de auditoria — mesmo mecanismo do
   * prontuário e do TCLE. Não é assinatura digital: validade jurídica plena
   * exigiria ICP-Brasil.
   */
  private hash(payload: unknown): string | undefined {
    const secret = this.appConfig.getConfig().prontuarioSignatureSecret;
    if (!secret) return undefined;
    return createHmac('sha256', secret).update(this.stableStringify(payload)).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map((i) => this.stableStringify(i)).join(',')}]`;
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${this.stableStringify(obj[k])}`)
      .join(',')}}`;
  }

  private numeroDeEnv(chave: string, padrao: number): number {
    const bruto = this.config.get<string>(chave);
    const n = bruto ? Number.parseInt(bruto, 10) : Number.NaN;
    return Number.isFinite(n) && n > 0 ? n : padrao;
  }

  private texto(valor: unknown): string {
    return typeof valor === 'string' ? valor.trim() : '';
  }

  private listaTexto(valor: unknown): string[] {
    return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
  }

  private escore(valor: unknown, padrao: number): number {
    const n = typeof valor === 'number' ? Math.round(valor) : Number.NaN;
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : padrao;
  }

  private enumOu<T extends Record<string, string>>(
    valor: unknown,
    enumerado: T,
    padrao: T[keyof T],
  ): T[keyof T] {
    const permitidos = Object.values(enumerado) as string[];
    return typeof valor === 'string' && permitidos.includes(valor)
      ? (valor as T[keyof T])
      : padrao;
  }
}
