import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { ProdutosService } from '../../produtos/application/produtos.service';
import { CategoriaLancamento, TipoLancamento } from '../domain/lancamento.entity';
import { LANCAMENTO_REPOSITORY } from '../financeiro.constants';
import { CadastrosFinanceirosService } from './cadastros.service';
import { FinanceiroService } from './financeiro.service';
import { RecorrenciasService } from './recorrencias.service';
import { RequestAuditContext } from './request-context';

const CLINICA = 'clinica-A';

const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'admin@teste.com', clinicaId: CLINICA },
} as unknown as RequestAuditContext;

describe('FinanceiroService.create', () => {
  let service: FinanceiroService;
  let lancamentos: { create: jest.Mock };
  let cadastros: { buscarServico: jest.Mock; garantirInstituicao: jest.Mock };
  let produtos: { buscar: jest.Mock };

  const base = {
    tipo: TipoLancamento.RECEITA,
    descricao: 'Venda de cobertura',
    valor: 179.8,
  };

  beforeEach(async () => {
    lancamentos = { create: jest.fn((input) => Promise.resolve({ ...input, id: 'l1' })) };
    cadastros = {
      buscarServico: jest.fn().mockResolvedValue({ id: 's1', preco: 250 }),
      garantirInstituicao: jest.fn().mockResolvedValue({ id: 'i1' }),
    };
    produtos = { buscar: jest.fn().mockResolvedValue({ id: 'p1', nome: 'Espuma', precoVenda: 89.9, custo: 52 }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FinanceiroService,
        { provide: LANCAMENTO_REPOSITORY, useValue: lancamentos },
        { provide: AUDIT_LOG_REPOSITORY, useValue: { create: jest.fn() } },
        { provide: CadastrosFinanceirosService, useValue: cadastros },
        { provide: RecorrenciasService, useValue: { materializar: jest.fn().mockResolvedValue([]) } },
        { provide: ProdutosService, useValue: produtos },
      ],
    }).compile();

    service = moduleRef.get(FinanceiroService);
  });

  it('congela o custo do produto no lançamento, para a margem não mudar com reajuste futuro', async () => {
    await service.create(
      { ...base, categoria: CategoriaLancamento.VENDA_PRODUTO, produtoId: 'p1', quantidade: 2 },
      context,
    );

    expect(lancamentos.create).toHaveBeenCalledWith(expect.objectContaining({ custoUnitario: 52 }));
  });

  it('deixa custoUnitario indefinido quando o produto não tem custo cadastrado', async () => {
    produtos.buscar.mockResolvedValue({ id: 'p1', nome: 'Espuma', precoVenda: 89.9 });

    await service.create(
      { ...base, categoria: CategoriaLancamento.VENDA_PRODUTO, produtoId: 'p1' },
      context,
    );

    expect(lancamentos.create).toHaveBeenCalledWith(expect.objectContaining({ custoUnitario: undefined }));
  });

  it('valida que o produto pertence à clínica antes de gravar', async () => {
    await service.create(
      { ...base, categoria: CategoriaLancamento.VENDA_PRODUTO, produtoId: 'p1' },
      context,
    );

    expect(produtos.buscar).toHaveBeenCalledWith(context.user, 'p1', undefined);
  });

  it('recusa venda de produto sem produto', async () => {
    await expect(
      service.create({ ...base, categoria: CategoriaLancamento.VENDA_PRODUTO }, context),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa categoria de despesa lançada como receita', async () => {
    await expect(
      service.create({ ...base, categoria: CategoriaLancamento.ALUGUEL }, context),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('não consulta o catálogo quando o lançamento não tem produto', async () => {
    await service.create({ ...base, categoria: CategoriaLancamento.CONSULTA }, context);
    expect(produtos.buscar).not.toHaveBeenCalled();
  });
});
