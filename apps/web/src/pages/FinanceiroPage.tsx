import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, TrendingUp, TrendingDown, Clock, Scale, Check, X, BarChart3, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { financeiroApi, produtosApi, type CreateLancamentoPayload } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { formatData, toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import {
  BarrasHorizontais,
  COR_DESPESA,
  COR_RECEITA,
  EvolucaoMensal,
  formatarValor,
} from '@/components/charts/FinanceiroCharts';
import {
  FormaPagamento,
  FORMA_PAGAMENTO_LABEL,
  StatusLancamento,
  STATUS_LANCAMENTO_LABEL,
  TipoLancamento,
  TIPO_LANCAMENTO_LABEL,
  CategoriaLancamento,
  CATEGORIA_LANCAMENTO_LABEL,
  CATEGORIA_DO_SERVICO,
  categoriasDoTipo,
  type DashboardFinanceiro,
  type Lancamento,
} from '@/types';

const PRODUTO_CATEGORIAS = new Set([CategoriaLancamento.VENDA_PRODUTO, CategoriaLancamento.COMPRA_PRODUTO]);

/** Sentinela: Radix Select não aceita value vazio. */
const NENHUM = '__nenhum__';

function lancamentoVariant(s: StatusLancamento): 'warning' | 'success' | 'destructive' {
  if (s === StatusLancamento.PENDENTE) return 'warning';
  if (s === StatusLancamento.RECEBIDO) return 'success';
  return 'destructive';
}

export function FinanceiroPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const [fTipo, setFTipo] = useState<TipoLancamento>(TipoLancamento.RECEITA);
  const [fDescricao, setFDescricao] = useState('');
  const [fValor, setFValor] = useState('');
  const [fForma, setFForma] = useState<FormaPagamento | ''>('');
  const [fVencimento, setFVencimento] = useState('');
  const [fObs, setFObs] = useState('');
  const [fCategoria, setFCategoria] = useState<CategoriaLancamento | ''>('');
  const [fServicoId, setFServicoId] = useState(NENHUM);
  const [fProdutoId, setFProdutoId] = useState('');
  const [fQuantidade, setFQuantidade] = useState('1');
  const [fInstituicaoId, setFInstituicaoId] = useState('');

  const dashQ = useQuery<DashboardFinanceiro>({
    queryKey: ['financeiro', 'dashboard'],
    queryFn: () => financeiroApi.dashboard(),
  });

  const listQ = useQuery({
    queryKey: ['financeiro', 'lancamentos'],
    queryFn: () => financeiroApi.list(),
  });

  const servicosQ = useQuery({
    queryKey: ['financeiro', 'servicos'],
    queryFn: () => financeiroApi.listServicos(),
    enabled: open,
  });

  const produtosQ = useQuery({
    queryKey: ['produtos'],
    queryFn: () => produtosApi.list(),
    enabled: open && PRODUTO_CATEGORIAS.has(fCategoria as CategoriaLancamento),
  });

  const instituicoesQ = useQuery({
    queryKey: ['financeiro', 'instituicoes'],
    queryFn: () => financeiroApi.listInstituicoes(),
    enabled: open && fCategoria === CategoriaLancamento.CONSULTORIA,
  });

  const createMut = useMutation({
    mutationFn: (payload: CreateLancamentoPayload) => financeiroApi.create(payload),
    onSuccess: () => {
      toast.success('Lançamento criado.');
      resetForm();
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const receberMut = useMutation({
    mutationFn: (id: string) => financeiroApi.receber(id),
    onSuccess: () => { toast.success('Lançamento baixado.'); void qc.invalidateQueries({ queryKey: ['financeiro'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const cancelarMut = useMutation({
    mutationFn: (id: string) => financeiroApi.cancelar(id),
    onSuccess: () => { toast.success('Lançamento cancelado.'); void qc.invalidateQueries({ queryKey: ['financeiro'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function resetForm() {
    setFTipo(TipoLancamento.RECEITA); setFDescricao(''); setFValor(''); setFForma('');
    setFVencimento(''); setFObs(''); setFCategoria(''); setFServicoId(NENHUM);
    setFProdutoId(''); setFQuantidade('1'); setFInstituicaoId('');
  }

  /**
   * Escolher o serviço traz o preço da tabela e a categoria correspondente —
   * mas o valor segue editável: desconto e caso especial são a regra, não a
   * exceção, numa clínica.
   */
  function aoEscolherServico(servicoId: string) {
    setFServicoId(servicoId);
    if (servicoId === NENHUM) return;

    const servico = (servicosQ.data ?? []).find((s) => s.id === servicoId);
    if (!servico) return;

    setFValor(String(servico.preco));
    setFCategoria(CATEGORIA_DO_SERVICO[servico.tipo]);
    if (!fDescricao) setFDescricao(servico.nome);
  }

  function aoEscolherProduto(produtoId: string) {
    setFProdutoId(produtoId);
    const produto = (produtosQ.data ?? []).find((p) => p.id === produtoId);
    if (!produto) return;

    const qtd = parseInt(fQuantidade, 10) || 1;
    setFValor((produto.precoVenda * qtd).toFixed(2));
    if (!fDescricao) setFDescricao(produto.nome);
  }

  const precisaProduto = PRODUTO_CATEGORIAS.has(fCategoria as CategoriaLancamento);
  const precisaInstituicao = fCategoria === CategoriaLancamento.CONSULTORIA;

  function submit() {
    if (!user?.clinicaId || !fDescricao || !fValor) { toast.error('Preencha os campos obrigatórios.'); return; }
    if (fCategoria === CategoriaLancamento.VENDA_PRODUTO && !fProdutoId) { toast.error('Selecione o produto.'); return; }

    createMut.mutate({
      clinicaId: user.clinicaId,
      tipo: fTipo,
      descricao: fDescricao,
      valor: parseFloat(fValor),
      formaPagamento: fForma || undefined,
      vencimento: fVencimento ? dayjs(fVencimento).toISOString() : undefined,
      observacoes: fObs || undefined,
      categoria: fCategoria || undefined,
      servicoId: fServicoId !== NENHUM ? fServicoId : undefined,
      produtoId: precisaProduto && fProdutoId ? fProdutoId : undefined,
      quantidade: precisaProduto && fProdutoId ? parseInt(fQuantidade, 10) || 1 : undefined,
      instituicaoId: precisaInstituicao && fInstituicaoId ? fInstituicaoId : undefined,
    });
  }

  const dash = dashQ.data;
  const lancamentos = toItems<Lancamento>(listQ.data as never);

  const statCards = [
    { label: 'Entradas', value: dash?.totalReceitas ?? 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Saídas', value: dash?.totalDespesas ?? 0, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-500/10' },
    { label: 'Pendente', value: dash?.totalPendente ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    {
      label: 'Saldo',
      value: dash?.saldo ?? 0,
      icon: Scale,
      color: (dash?.saldo ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: (dash?.saldo ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
  ];

  const receitasPorCategoria = (dash?.porCategoria ?? [])
    .filter((c) => c.tipo === TipoLancamento.RECEITA)
    .map((c) => ({ rotulo: CATEGORIA_LANCAMENTO_LABEL[c.categoria as CategoriaLancamento] ?? c.categoria, valor: c.total }));

  const despesasPorCategoria = (dash?.porCategoria ?? [])
    .filter((c) => c.tipo === TipoLancamento.DESPESA)
    .map((c) => ({ rotulo: CATEGORIA_LANCAMENTO_LABEL[c.categoria as CategoriaLancamento] ?? c.categoria, valor: c.total }));

  return (
    <div className="p-6">
      <PageHeader
        title="Financeiro"
        extra={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/financeiro/relatorio"><BarChart3 className="mr-2 h-4 w-4" /> Relatório</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/financeiro/configuracao"><Settings className="mr-2 h-4 w-4" /> Configuração</Link>
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo lançamento
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {dashQ.isLoading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          : statCards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${c.bg}`}><Icon className={`h-5 w-5 ${c.color}`} /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className={`text-lg font-bold ${c.color}`}>{formatarValor(c.value)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4">Entradas por fonte (mês)</h3>
            {dashQ.isLoading
              ? <Skeleton className="h-32 w-full" />
              : <BarrasHorizontais dados={receitasPorCategoria} cor={COR_RECEITA} vazio="Nenhuma entrada no mês." />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4">Saídas por categoria (mês)</h3>
            {dashQ.isLoading
              ? <Skeleton className="h-32 w-full" />
              : <BarrasHorizontais dados={despesasPorCategoria} cor={COR_DESPESA} vazio="Nenhuma saída no mês." />}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-4">Evolução do caixa (12 meses)</h3>
          {dashQ.isLoading ? <Skeleton className="h-48 w-full" /> : <EvolucaoMensal dados={dash?.serieMensal ?? []} />}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {listQ.isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="max-w-xs truncate font-medium">
                        {l.descricao}
                        {l.recorrenciaId && (
                          <Badge variant="secondary" className="ml-2">recorrente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.tipo === TipoLancamento.RECEITA ? 'success' : 'destructive'}>
                          {l.categoria
                            ? CATEGORIA_LANCAMENTO_LABEL[l.categoria] ?? l.categoria
                            : TIPO_LANCAMENTO_LABEL[l.tipo] ?? l.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{formatarValor(l.valor)}</TableCell>
                      <TableCell><Badge variant={lancamentoVariant(l.status)}>{STATUS_LANCAMENTO_LABEL[l.status] ?? l.status}</Badge></TableCell>
                      <TableCell>{l.formaPagamento ? (FORMA_PAGAMENTO_LABEL[l.formaPagamento] ?? l.formaPagamento) : '—'}</TableCell>
                      <TableCell>{formatData(l.vencimento)}</TableCell>
                      <TableCell>
                        {l.status === StatusLancamento.PENDENTE && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title="Marcar como pago/recebido" onClick={() => receberMut.mutate(l.id)}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Cancelar" onClick={() => cancelarMut.mutate(l.id)}>
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lancamentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Entrada ou saída</Label>
              <Select
                value={fTipo}
                onValueChange={(v) => { setFTipo(v as TipoLancamento); setFCategoria(''); setFServicoId(NENHUM); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoLancamento).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_LANCAMENTO_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fTipo === TipoLancamento.RECEITA && (
              <div className="space-y-2">
                <Label>Serviço da tabela de preços</Label>
                <Select value={fServicoId} onValueChange={aoEscolherServico}>
                  <SelectTrigger>
                    <SelectValue placeholder={servicosQ.isLoading ? 'Carregando...' : 'Opcional — preenche o valor'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Nenhum (valor livre)</SelectItem>
                    {(servicosQ.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome} — {formatarValor(s.preco)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={fCategoria} onValueChange={(v) => { setFCategoria(v as CategoriaLancamento); setFProdutoId(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categoriasDoTipo(fTipo).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LANCAMENTO_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {precisaProduto && (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label>Produto</Label>
                  <Select value={fProdutoId} onValueChange={aoEscolherProduto}>
                    <SelectTrigger><SelectValue placeholder={produtosQ.isLoading ? 'Carregando...' : 'Selecione'} /></SelectTrigger>
                    <SelectContent>
                      {(produtosQ.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome} — {formatarValor(p.precoVenda)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fQtd">Qtd.</Label>
                  <Input
                    id="fQtd" type="number" min="1" step="1" value={fQuantidade}
                    onChange={(e) => { setFQuantidade(e.target.value); if (fProdutoId) aoEscolherProduto(fProdutoId); }}
                  />
                </div>
              </div>
            )}

            {precisaInstituicao && (
              <div className="space-y-2">
                <Label>Instituição</Label>
                <Select value={fInstituicaoId} onValueChange={setFInstituicaoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(instituicoesQ.data ?? []).map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fDesc">Descrição</Label>
              <Input id="fDesc" value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fVal">Valor (R$)</Label>
              <Input id="fVal" type="number" min="0" step="0.01" placeholder="0,00" value={fValor} onChange={(e) => setFValor(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={fForma} onValueChange={(v) => setFForma(v as FormaPagamento)}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {Object.values(FormaPagamento).map((f) => <SelectItem key={f} value={f}>{FORMA_PAGAMENTO_LABEL[f]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fVenc">Vencimento</Label>
              <Input id="fVenc" type="date" value={fVencimento} onChange={(e) => setFVencimento(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fObsFin">Observações</Label>
              <Textarea id="fObsFin" rows={2} value={fObs} onChange={(e) => setFObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
