import { NotFoundException } from '@nestjs/common';
import { PlanoCuidadosService } from './plano-cuidados.service';
import {
  CATALOGO_CLINICO_VERSAO,
  EixoFenomeno,
  TaxonomiaTermo,
  TipoAcao,
} from '../domain/catalogo-clinico.entity';
import {
  PlanoCuidados,
  PrioridadeDiagnostico,
  StatusDiagnostico,
  StatusPlano,
  UrgenciaAcao,
} from '../domain/plano-cuidados.entity';

const auditoria = { skill: 's', modelo: 'm', tokensEntrada: 1, tokensSaida: 1, em: new Date() };

const fenomeno = {
  id: '1',
  codigo: 'local-f-001',
  titulo: 'Integridade da pele comprometida',
  eixo: EixoFenomeno.FOCO,
  taxonomia: TaxonomiaTermo.LOCAL_PROVISORIO,
  codigoCipeOficial: null,
  sinonimos: [],
  manifestacoesClinicas: [],
  fatoresRelacionados: [],
  contextoEstomaterapia: [],
  acoesVinculadas: [],
  resultadosVinculados: [],
  palavrasChave: [],
};

const acao = {
  id: '2',
  codigo: 'local-a-001',
  titulo: 'Avaliação de ferida',
  taxonomia: TaxonomiaTermo.LOCAL_PROVISORIO,
  codigoCipeOficial: null,
  atividades: [],
  tipo: TipoAcao.AUTONOMA,
  frequenciasRecomendadas: [],
  fenomenosVinculados: ['local-f-001'],
  palavrasChave: [],
};

const resultado = {
  id: '3',
  codigo: 'local-r-001',
  titulo: 'Cicatrização de ferida',
  taxonomia: TaxonomiaTermo.LOCAL_PROVISORIO,
  codigoCipeOficial: null,
  indicadores: [],
  fenomenosVinculados: ['local-f-001'],
  palavrasChave: [],
};

function montar(overrides: {
  diagnosticos?: unknown[];
  planoResultados?: unknown[];
  prescricoes?: unknown[];
  fenomenos?: unknown[];
}) {
  const criado: { valor?: Record<string, unknown> } = {};

  const ai = {
    extrairDadosClinicos: jest.fn().mockResolvedValue({
      resultado: { palavrasChaveClinicas: ['ferida'] },
      auditoria,
    }),
    gerarDiagnosticos: jest.fn().mockResolvedValue({
      resultado: { diagnosticos: overrides.diagnosticos ?? [] },
      auditoria,
    }),
    gerarResultados: jest.fn().mockResolvedValue({
      resultado: { planoResultados: overrides.planoResultados ?? [] },
      auditoria,
    }),
    gerarPrescricoes: jest.fn().mockResolvedValue({
      resultado: { prescricoes: overrides.prescricoes ?? [] },
      auditoria,
    }),
    reavaliarPlano: jest.fn(),
  };

  const planos = {
    create: jest.fn(async (d: Record<string, unknown>) => {
      criado.valor = d;
      return { id: 'p1', ...d } as unknown as PlanoCuidados;
    }),
    findById: jest.fn(),
    listByPaciente: jest.fn(),
    appendEvolucao: jest.fn(),
  };

  const catalogo = {
    buscarFenomenos: jest.fn().mockResolvedValue(overrides.fenomenos ?? [fenomeno]),
    acoesPorFenomenos: jest.fn().mockResolvedValue([acao]),
    resultadosPorFenomenos: jest.fn().mockResolvedValue([resultado]),
    buscarTermos: jest.fn(),
  };

  const service = new PlanoCuidadosService(
    ai as never,
    { get: () => undefined } as never,
    { getConfig: () => ({ prontuarioSignatureSecret: 'segredo-de-teste' }) } as never,
    planos as never,
    catalogo as never,
  );

  return { service, ai, planos, catalogo, criado };
}

const dto = {
  pacienteId: '507f1f77bcf86cd799439011',
  historicoTexto: 'Paciente com úlcera venosa em membro inferior esquerdo há seis meses.',
};

describe('PlanoCuidadosService — trava do catálogo', () => {
  it('descarta diagnóstico cujo código não existe no catálogo', async () => {
    const { service, criado } = montar({
      diagnosticos: [
        {
          codigoFenomeno: 'local-f-001',
          enunciado: 'válido',
          prioridade: 'ALTA',
          status: 'CONFIRMADO',
          raciocinioClinico: 'r',
        },
        // Código inventado pelo modelo — não pode chegar ao registro imutável.
        {
          codigoFenomeno: 'cipe-f-999',
          enunciado: 'alucinado',
          prioridade: 'ALTA',
          status: 'CONFIRMADO',
          raciocinioClinico: 'r',
        },
      ],
    });

    await service.gerar(dto as never, 'clinica-1', 'enf-1');

    const diagnosticos = criado.valor!.diagnosticos as { codigoFenomeno: string }[];
    expect(diagnosticos).toHaveLength(1);
    expect(diagnosticos[0].codigoFenomeno).toBe('local-f-001');
  });

  it('descarta ação prescrita fora do catálogo', async () => {
    const { service, criado } = montar({
      diagnosticos: [
        { codigoFenomeno: 'local-f-001', enunciado: 'e', prioridade: 'ALTA', status: 'CONFIRMADO', raciocinioClinico: 'r' },
      ],
      prescricoes: [
        {
          diagnosticoRef: 'local-f-001',
          resultadoRef: 'local-r-001',
          acoes: [
            { codigo: 'local-a-001', titulo: 'ok', tipo: 'autonoma', urgencia: 'ROTINA', atividades: [] },
            { codigo: 'local-a-inventada', titulo: 'nao', tipo: 'autonoma', urgencia: 'ROTINA', atividades: [] },
          ],
          orientacoesPacienteCuidador: [],
        },
      ],
    });

    await service.gerar(dto as never, 'clinica-1', 'enf-1');

    const prescricoes = criado.valor!.prescricoes as { acoes: { codigo: string }[] }[];
    expect(prescricoes[0].acoes.map((a) => a.codigo)).toEqual(['local-a-001']);
  });

  it('descarta resultado fora do catálogo', async () => {
    const { service, criado } = montar({
      diagnosticos: [
        { codigoFenomeno: 'local-f-001', enunciado: 'e', prioridade: 'ALTA', status: 'CONFIRMADO', raciocinioClinico: 'r' },
      ],
      planoResultados: [
        {
          diagnosticoRef: 'local-f-001',
          resultados: [
            { codigo: 'local-r-001', titulo: 'ok', escoreBaseline: 2, escoreMeta: 4, prazo: '30 dias', indicadores: [] },
            { codigo: 'local-r-fantasma', titulo: 'nao', escoreBaseline: 1, escoreMeta: 5, prazo: 'x', indicadores: [] },
          ],
        },
      ],
    });

    await service.gerar(dto as never, 'clinica-1', 'enf-1');

    const resultados = criado.valor!.resultadosEsperados as { codigo: string }[];
    expect(resultados.map((r) => r.codigo)).toEqual(['local-r-001']);
  });

  it('não chama a IA de diagnóstico quando o catálogo não tem candidato', async () => {
    const { service, ai, criado } = montar({ fenomenos: [] });

    await service.gerar(dto as never, 'clinica-1', 'enf-1');

    expect(ai.gerarDiagnosticos).not.toHaveBeenCalled();
    expect(criado.valor!.diagnosticos).toEqual([]);
    expect(criado.valor!.status).toBe(StatusPlano.ATIVO);
  });
});

describe('PlanoCuidadosService — normalização e registro', () => {
  it('cai para HIPOTESE_PROVISORIA quando o status vem inválido', async () => {
    const { service, criado } = montar({
      diagnosticos: [
        { codigoFenomeno: 'local-f-001', enunciado: 'e', prioridade: 'URGENTISSIMA', status: 'TALVEZ', raciocinioClinico: 'r' },
      ],
    });

    await service.gerar(dto as never, 'clinica-1', 'enf-1');

    const [d] = criado.valor!.diagnosticos as { status: string; prioridade: string }[];
    expect(d.status).toBe(StatusDiagnostico.HIPOTESE_PROVISORIA);
    expect(d.prioridade).toBe(PrioridadeDiagnostico.MEDIA);
  });

  it('normaliza escore fora da faixa 1-5', async () => {
    const { service, criado } = montar({
      diagnosticos: [
        { codigoFenomeno: 'local-f-001', enunciado: 'e', prioridade: 'ALTA', status: 'CONFIRMADO', raciocinioClinico: 'r' },
      ],
      planoResultados: [
        {
          diagnosticoRef: 'local-f-001',
          resultados: [
            { codigo: 'local-r-001', titulo: 'x', escoreBaseline: 42, escoreMeta: -3, prazo: '30d', indicadores: [] },
          ],
        },
      ],
    });

    await service.gerar(dto as never, 'clinica-1', 'enf-1');

    const [r] = criado.valor!.resultadosEsperados as { escoreBaseline: number; escoreMeta: number }[];
    expect(r.escoreBaseline).toBe(1);
    expect(r.escoreMeta).toBe(5);
  });

  it('grava versão do catálogo, hash de integridade e auditoria de IA', async () => {
    const { service, criado } = montar({
      diagnosticos: [
        { codigoFenomeno: 'local-f-001', enunciado: 'e', prioridade: 'ALTA', status: 'CONFIRMADO', raciocinioClinico: 'r' },
      ],
    });

    await service.gerar(dto as never, 'clinica-1', 'enf-1');

    expect(criado.valor!.versaoCatalogo).toBe(CATALOGO_CLINICO_VERSAO);
    expect(criado.valor!.hashIntegridade).toMatch(/^[a-f0-9]{64}$/);
    // Extração, diagnóstico, resultado e prescrição — uma entrada por chamada.
    expect(criado.valor!.auditoriaIa).toHaveLength(4);
  });

  it('preserva a taxonomia do catálogo no diagnóstico gravado', async () => {
    const { service, criado } = montar({
      diagnosticos: [
        { codigoFenomeno: 'local-f-001', enunciado: 'e', prioridade: 'ALTA', status: 'CONFIRMADO', raciocinioClinico: 'r' },
      ],
    });

    await service.gerar(dto as never, 'clinica-1', 'enf-1');

    const [d] = criado.valor!.diagnosticos as { taxonomia: string }[];
    expect(d.taxonomia).toBe(TaxonomiaTermo.LOCAL_PROVISORIO);
  });
});

describe('PlanoCuidadosService — evolução', () => {
  it('descarta decisão sobre diagnóstico que não está no plano', async () => {
    const { service, ai, planos } = montar({});

    const plano = {
      id: 'p1',
      diagnosticos: [{ codigoFenomeno: 'local-f-001' }],
      resultadosEsperados: [],
      prescricoes: [],
      evolucoes: [],
    } as unknown as PlanoCuidados;

    planos.findById.mockResolvedValue(plano);
    planos.appendEvolucao.mockImplementation(async (_c: string, _i: string, ev: unknown) => ({
      ...plano,
      evolucoes: [ev],
    }));
    ai.reavaliarPlano.mockResolvedValue({
      resultado: {
        avaliacoes: [
          { diagnosticoRef: 'local-f-001', decisao: 'B', justificativa: 'j', escoreAnterior: 2, escoreAtual: 3 },
          { diagnosticoRef: 'local-f-orfao', decisao: 'D', justificativa: 'j', escoreAnterior: 1, escoreAtual: 5 },
        ],
        textoSoap: { s: 's', o: 'o', a: 'a', p: 'p' },
      },
      auditoria,
    });

    await service.evoluir('p1', { relatoEvolucao: 'evoluiu bem' } as never, 'clinica-1', 'enf-1');

    const ev = planos.appendEvolucao.mock.calls[0][2] as { decisoes: { diagnosticoRef: string }[] };
    expect(ev.decisoes).toHaveLength(1);
    expect(ev.decisoes[0].diagnosticoRef).toBe('local-f-001');
  });

  it('404 quando o plano não existe no tenant', async () => {
    const { service, planos } = montar({});
    planos.findById.mockResolvedValue(null);

    await expect(
      service.evoluir('inexistente', { relatoEvolucao: 'x'.repeat(20) } as never, 'clinica-1', 'enf-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// Referenciado para manter o import usado quando a urgência entra nos asserts.
void UrgenciaAcao;
