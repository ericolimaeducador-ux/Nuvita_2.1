import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { CategoriaLancamento, Lancamento, TipoLancamento } from '../domain/lancamento.entity';
import { Recorrencia } from '../domain/recorrencia.entity';
import { LANCAMENTO_REPOSITORY, RECORRENCIA_REPOSITORY } from '../financeiro.constants';
import { CadastrosFinanceirosService } from './cadastros.service';
import { RecorrenciasService } from './recorrencias.service';
import { RequestAuditContext } from './request-context';

const CLINICA = 'clinica-A';

const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'admin@teste.com', clinicaId: CLINICA },
} as unknown as RequestAuditContext;

function recorrencia(parcial: Partial<Recorrencia> = {}): Recorrencia {
  return {
    id: 'r1',
    clinicaId: CLINICA,
    descricao: 'Aluguel da sala',
    tipo: TipoLancamento.DESPESA,
    categoria: CategoriaLancamento.ALUGUEL,
    valorMensal: 2200,
    diaVencimento: 5,
    inicio: new Date(2026, 0, 1),
    fim: new Date(2026, 2, 31),
    ativo: true,
    criadoEm: new Date(2026, 0, 1),
    ...parcial,
  };
}

describe('RecorrenciasService', () => {
  let service: RecorrenciasService;
  let recorrencias: { findAll: jest.Mock; findById: jest.Mock; create: jest.Mock; update: jest.Mock };
  let lancamentos: { create: jest.Mock; competenciasExistentes: jest.Mock };
  let cadastros: { garantirInstituicao: jest.Mock };

  beforeEach(async () => {
    recorrencias = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      create: jest.fn((input) => Promise.resolve({ ...input, id: 'nova' })),
      update: jest.fn(),
    };
    lancamentos = {
      create: jest.fn((input) => Promise.resolve({ ...input, id: `l-${input.competencia}` } as Lancamento)),
      competenciasExistentes: jest.fn().mockResolvedValue([]),
    };
    cadastros = { garantirInstituicao: jest.fn().mockResolvedValue({ id: 'i1' }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecorrenciasService,
        { provide: RECORRENCIA_REPOSITORY, useValue: recorrencias },
        { provide: LANCAMENTO_REPOSITORY, useValue: lancamentos },
        { provide: AUDIT_LOG_REPOSITORY, useValue: { create: jest.fn() } },
        { provide: CadastrosFinanceirosService, useValue: cadastros },
      ],
    }).compile();

    service = moduleRef.get(RecorrenciasService);
  });

  describe('materializar', () => {
    it('cria um lançamento por competência devida', async () => {
      recorrencias.findAll.mockResolvedValue([recorrencia()]);

      const criados = await service.materializar(CLINICA, context);

      expect(criados).toHaveLength(3);
      expect(criados.map((l) => l.competencia)).toEqual(['2026-01', '2026-02', '2026-03']);
      expect(lancamentos.create).toHaveBeenCalledTimes(3);
    });

    it('não recria competências que já existem — é o que torna seguro chamar a cada consulta', async () => {
      recorrencias.findAll.mockResolvedValue([recorrencia()]);
      lancamentos.competenciasExistentes.mockResolvedValue(['2026-01', '2026-02']);

      const criados = await service.materializar(CLINICA, context);

      expect(criados).toHaveLength(1);
      expect(criados[0].competencia).toBe('2026-03');
    });

    it('não cria nada quando tudo já foi materializado', async () => {
      recorrencias.findAll.mockResolvedValue([recorrencia()]);
      lancamentos.competenciasExistentes.mockResolvedValue(['2026-01', '2026-02', '2026-03']);

      expect(await service.materializar(CLINICA, context)).toHaveLength(0);
      expect(lancamentos.create).not.toHaveBeenCalled();
    });

    it('engole E11000 (outra requisição materializou a mesma competência) sem falhar', async () => {
      recorrencias.findAll.mockResolvedValue([recorrencia()]);
      lancamentos.create
        .mockRejectedValueOnce(Object.assign(new Error('duplicate key'), { code: 11000 }))
        .mockImplementation((input) => Promise.resolve({ ...input, id: 'ok' } as Lancamento));

      const criados = await service.materializar(CLINICA, context);

      // A competência perdida na corrida não vira erro; as outras seguem.
      expect(criados).toHaveLength(2);
    });

    it('propaga o valor e o vencimento configurados para cada competência', async () => {
      recorrencias.findAll.mockResolvedValue([recorrencia({ valorMensal: 3500, diaVencimento: 10 })]);

      const criados = await service.materializar(CLINICA, context);

      expect(criados.every((l) => l.valor === 3500)).toBe(true);
      expect(criados[0].vencimento?.getDate()).toBe(10);
    });

    it('nunca deixa a exceção escapar — materializar é efeito de fundo e não pode derrubar a tela', async () => {
      recorrencias.findAll.mockRejectedValue(new Error('mongo caiu'));

      await expect(service.materializar(CLINICA, context)).resolves.toEqual([]);
    });

    it('só materializa recorrências da própria clínica', async () => {
      await service.materializar(CLINICA, context);
      expect(recorrencias.findAll).toHaveBeenCalledWith(CLINICA, true);
    });
  });

  describe('criar', () => {
    const base = {
      descricao: 'Contrato ILPI',
      valorMensal: 3500,
      diaVencimento: 10,
      inicio: new Date(2026, 0, 1).toISOString(),
    };

    it('recusa contrato de consultoria sem instituição contratante', async () => {
      await expect(
        service.criar(
          { ...base, tipo: TipoLancamento.RECEITA, categoria: CategoriaLancamento.CONSULTORIA },
          context,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa categoria incompatível com o tipo (aluguel não é entrada de caixa)', async () => {
      await expect(
        service.criar(
          { ...base, tipo: TipoLancamento.RECEITA, categoria: CategoriaLancamento.ALUGUEL },
          context,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa vigência que termina antes de começar', async () => {
      await expect(
        service.criar(
          {
            ...base,
            tipo: TipoLancamento.DESPESA,
            categoria: CategoriaLancamento.ALUGUEL,
            fim: new Date(2025, 0, 1).toISOString(),
          },
          context,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('valida que a instituição existe na clínica antes de aceitar o contrato', async () => {
      await service.criar(
        {
          ...base,
          tipo: TipoLancamento.RECEITA,
          categoria: CategoriaLancamento.CONSULTORIA,
          instituicaoId: 'i1',
        },
        context,
      );

      expect(cadastros.garantirInstituicao).toHaveBeenCalledWith(CLINICA, 'i1');
    });

    it('aceita despesa recorrente sem instituição', async () => {
      await expect(
        service.criar(
          { ...base, descricao: 'Aluguel', tipo: TipoLancamento.DESPESA, categoria: CategoriaLancamento.ALUGUEL },
          context,
        ),
      ).resolves.toBeDefined();
    });
  });
});
