import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, TrendingUp, TrendingDown, Clock, Scale, Check, X } from 'lucide-react';
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
  FormaPagamento,
  FORMA_PAGAMENTO_LABEL,
  StatusLancamento,
  STATUS_LANCAMENTO_LABEL,
  TipoLancamento,
  TIPO_LANCAMENTO_LABEL,
  CategoriaLancamento,
  CATEGORIA_LANCAMENTO_LABEL,
  type DashboardFinanceiro,
  type Lancamento,
} from '@/types';

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PRODUTO_CATEGORIAS = new Set([CategoriaLancamento.VENDA_PRODUTO, CategoriaLancamento.COMPRA_PRODUTO]);

/** Composição por categoria: receita (emerald) x despesa (red) — mesma convenção já usada nos cards. */
function CategoriaChart({ dados }: { dados: DashboardFinanceiro['porCategoria'] }) {
  if (dados.length === 0) return <p className="text-sm text-muted-foreground">Sem lançamentos recebidos no período.</p>;

  const porCategoria = new Map<string, { receita: number; despesa: number }>();
  for (const d of dados) {
    const atual = porCategoria.get(d.categoria) ?? { receita: 0, despesa: 0 };
    if (d.tipo === TipoLancamento.RECEITA) atual.receita += d.total; else atual.despesa += d.total;
    porCategoria.set(d.categoria, atual);
  }
  const max = Math.max(1, ...Array.from(porCategoria.values()).flatMap((v) => [v.receita, v.despesa]));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Receita</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Despesa</span>
      </div>
      {Array.from(porCategoria.entries()).map(([categoria, v]) => (
        <div key={categoria} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{CATEGORIA_LANCAMENTO_LABEL[categoria as CategoriaLancamento] ?? categoria}</span>
          </div>
          <div className="space-y-1">
            {v.receita > 0 && (
              <div className="flex items-center gap-2" title={`Receita: ${fmtValor(v.receita)}`}>
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(v.receita / max) * 100}%` }} />
                </div>
                <span className="w-24 text-right text-xs text-muted-foreground">{fmtValor(v.receita)}</span>
              </div>
            )}
            {v.despesa > 0 && (
              <div className="flex items-center gap-2" title={`Despesa: ${fmtValor(v.despesa)}`}>
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: `${(v.despesa / max) * 100}%` }} />
                </div>
                <span className="w-24 text-right text-xs text-muted-foreground">{fmtValor(v.despesa)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Evolução mensal (12 meses): receitas x despesas, mesma escala (um único eixo). */
function SerieMensalChart({ dados }: { dados: DashboardFinanceiro['serieMensal'] }) {
  if (dados.length === 0) return null;

  const width = 720;
  const height = 200;
  const padX = 12;
  const padY = 16;
  const max = Math.max(1, ...dados.flatMap((d) => [d.receitas, d.despesas]));
  const stepX = (width - padX * 2) / (dados.length - 1 || 1);
  const y = (v: number) => height - padY - (v / max) * (height - padY * 2);
  const pontos = (chave: 'receitas' | 'despesas') =>
    dados.map((d, i) => `${padX + i * stepX},${y(d[chave])}`).join(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-emerald-500" /> Receitas</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-red-500" /> Despesas</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Evolução mensal de receitas e despesas">
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} className="stroke-muted" strokeWidth={1} />
        <polyline points={pontos('receitas')} fill="none" className="stroke-emerald-500" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pontos('despesas')} fill="none" className="stroke-red-500" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {dados.map((d, i) => (
          <g key={d.mes}>
            <circle cx={padX + i * stepX} cy={y(d.receitas)} r={3} className="fill-emerald-500">
              <title>{`${d.mes} — Receitas: ${fmtValor(d.receitas)}`}</title>
            </circle>
            <circle cx={padX + i * stepX} cy={y(d.despesas)} r={3} className="fill-red-500">
              <title>{`${d.mes} — Despesas: ${fmtValor(d.despesas)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        {dados.map((d, i) => (
          <span key={d.mes} className={i % 2 === 0 ? '' : 'hidden sm:inline'}>{dayjs(`${d.mes}-01`).format('MMM/YY')}</span>
        ))}
      </div>
    </div>
  );
}

function lancamentoVariant(s: StatusLancamento): 'warning' | 'success' | 'destructive' {
  if (s === StatusLancamento.PENDENTE) return 'warning';
  if (s === StatusLancamento.RECEBIDO) return 'success';
  return 'destructive';
}

export function FinanceiroPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const [fTipo, setFTipo] = useState<TipoLancamento | ''>('');
  const [fDescricao, setFDescricao] = useState('');
  const [fValor, setFValor] = useState('');
  const [fForma, setFForma] = useState<FormaPagamento | ''>('');
  const [fVencimento, setFVencimento] = useState('');
  const [fObs, setFObs] = useState('');
  const [fCategoria, setFCategoria] = useState<CategoriaLancamento | ''>('');
  const [fProdutoId, setFProdutoId] = useState('');
  const [fQuantidade, setFQuantidade] = useState('1');

  const dashQ = useQuery<DashboardFinanceiro>({
    queryKey: ['financeiro', 'dashboard'],
    queryFn: () => financeiroApi.dashboard(),
  });

  const listQ = useQuery({
    queryKey: ['financeiro', 'lancamentos'],
    queryFn: () => financeiroApi.list(),
  });

  const produtosQ = useQuery({
    queryKey: ['produtos'],
    queryFn: () => produtosApi.list(),
    enabled: open && PRODUTO_CATEGORIAS.has(fCategoria as CategoriaLancamento),
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
    onSuccess: () => { toast.success('Lançamento marcado como recebido.'); void qc.invalidateQueries({ queryKey: ['financeiro'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const cancelarMut = useMutation({
    mutationFn: (id: string) => financeiroApi.cancelar(id),
    onSuccess: () => { toast.success('Lançamento cancelado.'); void qc.invalidateQueries({ queryKey: ['financeiro'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function resetForm() {
    setFTipo(''); setFDescricao(''); setFValor(''); setFForma(''); setFVencimento(''); setFObs('');
    setFCategoria(''); setFProdutoId(''); setFQuantidade('1');
  }

  const precisaProduto = PRODUTO_CATEGORIAS.has(fCategoria as CategoriaLancamento);

  function submit() {
    if (!user?.clinicaId || !fTipo || !fDescricao || !fValor) { toast.error('Preencha os campos obrigatórios.'); return; }
    if (precisaProduto && !fProdutoId) { toast.error('Selecione o produto.'); return; }
    createMut.mutate({
      clinicaId: user.clinicaId,
      tipo: fTipo,
      descricao: fDescricao,
      valor: parseFloat(fValor),
      formaPagamento: fForma || undefined,
      vencimento: fVencimento ? dayjs(fVencimento).toISOString() : undefined,
      observacoes: fObs || undefined,
      categoria: fCategoria || undefined,
      produtoId: precisaProduto ? fProdutoId : undefined,
      quantidade: precisaProduto ? parseInt(fQuantidade, 10) || 1 : undefined,
    });
  }

  const dash = dashQ.data;
  const lancamentos = toItems<Lancamento>(listQ.data as never);

  const statCards = [
    { label: 'Receitas', value: dash?.totalReceitas ?? 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Despesas', value: dash?.totalDespesas ?? 0, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-500/10' },
    { label: 'Pendente', value: dash?.totalPendente ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    {
      label: 'Saldo',
      value: dash?.saldo ?? 0,
      icon: Scale,
      color: (dash?.saldo ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: (dash?.saldo ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Financeiro"
        extra={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo lançamento
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {dashQ.isLoading
          ? [1,2,3,4].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          : statCards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${c.bg}`}><Icon className={`h-5 w-5 ${c.color}`} /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className={`text-lg font-bold ${c.color}`}>{fmtValor(c.value)}</p>
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
            <h3 className="text-sm font-semibold mb-4">Composição por categoria</h3>
            {dashQ.isLoading ? <Skeleton className="h-32 w-full" /> : <CategoriaChart dados={dash?.porCategoria ?? []} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4">Evolução mensal (12 meses)</h3>
            {dashQ.isLoading ? <Skeleton className="h-32 w-full" /> : <SerieMensalChart dados={dash?.serieMensal ?? []} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          {listQ.isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
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
                    <TableCell className="max-w-xs truncate font-medium">{l.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={l.tipo === TipoLancamento.RECEITA ? 'success' : 'destructive'}>
                        {TIPO_LANCAMENTO_LABEL[l.tipo] ?? l.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{fmtValor(l.valor)}</TableCell>
                    <TableCell><Badge variant={lancamentoVariant(l.status)}>{STATUS_LANCAMENTO_LABEL[l.status] ?? l.status}</Badge></TableCell>
                    <TableCell>{l.formaPagamento ? (FORMA_PAGAMENTO_LABEL[l.formaPagamento] ?? l.formaPagamento) : '—'}</TableCell>
                    <TableCell>{formatData(l.vencimento)}</TableCell>
                    <TableCell>
                      {l.status === StatusLancamento.PENDENTE && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Marcar como recebido" onClick={() => receberMut.mutate(l.id)}>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={fTipo} onValueChange={(v) => setFTipo(v as TipoLancamento)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoLancamento).map((t) => <SelectItem key={t} value={t}>{TIPO_LANCAMENTO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fDesc">Descrição</Label>
              <Input id="fDesc" value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fVal">Valor (R$)</Label>
              <Input id="fVal" type="number" min="0" step="0.01" placeholder="0,00" value={fValor} onChange={(e) => setFValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={fCategoria}
                onValueChange={(v) => { setFCategoria(v as CategoriaLancamento); setFProdutoId(''); }}
              >
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {Object.values(CategoriaLancamento).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LANCAMENTO_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {precisaProduto && (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label>Produto</Label>
                  <Select value={fProdutoId} onValueChange={setFProdutoId}>
                    <SelectTrigger><SelectValue placeholder={produtosQ.isLoading ? 'Carregando...' : 'Selecione'} /></SelectTrigger>
                    <SelectContent>
                      {(produtosQ.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fQtd">Qtd.</Label>
                  <Input id="fQtd" type="number" min="1" step="1" value={fQuantidade} onChange={(e) => setFQuantidade(e.target.value)} />
                </div>
              </div>
            )}
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
