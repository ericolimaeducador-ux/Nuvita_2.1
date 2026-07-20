import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Download, Printer, TrendingUp, TrendingDown, Scale, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { financeiroApi, type RelatorioParams } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import {
  BarrasHorizontais,
  COR_DESPESA,
  COR_RECEITA,
  EvolucaoMensal,
  formatarValor,
  type ItemBarra,
} from '@/components/charts/FinanceiroCharts';
import {
  CATEGORIA_LANCAMENTO_LABEL,
  CategoriaLancamento,
  type Instituicao,
  type RelatorioFinanceiro,
} from '@/types';

/** Sentinela: Radix Select não aceita value vazio para "todos". */
const TODOS = '__todos__';

function rotuloCategoria(chave: string): string {
  return CATEGORIA_LANCAMENTO_LABEL[chave as CategoriaLancamento] ?? chave;
}

function paraBarras(
  linhas: RelatorioFinanceiro['fontesReceita'],
  incluirTicket = true,
): ItemBarra[] {
  return linhas.map((l) => ({
    rotulo: rotuloCategoria(l.categoria),
    valor: l.total,
    detalhe: incluirTicket
      ? `${l.quantidade} ${l.quantidade === 1 ? 'lançamento' : 'lançamentos'} · ticket médio ${formatarValor(l.ticketMedio)}`
      : `${l.quantidade} ${l.quantidade === 1 ? 'lançamento' : 'lançamentos'}`,
  }));
}

export function RelatorioFinanceiroPage() {
  const inicioPadrao = dayjs().startOf('month').format('YYYY-MM-DD');
  const fimPadrao = dayjs().endOf('month').format('YYYY-MM-DD');

  const [dataInicio, setDataInicio] = useState(inicioPadrao);
  const [dataFim, setDataFim] = useState(fimPadrao);
  const [categoria, setCategoria] = useState<string>(TODOS);
  const [instituicaoId, setInstituicaoId] = useState<string>(TODOS);
  const [baixando, setBaixando] = useState(false);

  const filtros: RelatorioParams = {
    dataInicio: dayjs(dataInicio).startOf('day').toISOString(),
    dataFim: dayjs(dataFim).endOf('day').toISOString(),
    ...(categoria !== TODOS ? { categoria } : {}),
    ...(instituicaoId !== TODOS ? { instituicaoId } : {}),
  };

  const relatorioQ = useQuery({
    queryKey: ['financeiro', 'relatorio', filtros],
    queryFn: () => financeiroApi.relatorio(filtros),
    // Segura o render anterior enquanto refaz — sem piscar esqueleto.
    placeholderData: (anterior) => anterior,
  });

  const instituicoesQ = useQuery<Instituicao[]>({
    queryKey: ['financeiro', 'instituicoes'],
    queryFn: () => financeiroApi.listInstituicoes(),
  });

  const rel = relatorioQ.data;

  async function baixarCsv() {
    setBaixando(true);
    try {
      const csv = await financeiroApi.relatorioCsv(filtros);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `financeiro-${dataInicio}-a-${dataFim}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Erro ao exportar', apiErrorMessage(e));
    } finally {
      setBaixando(false);
    }
  }

  const cards = [
    { label: 'Entradas', valor: rel?.totalReceitas ?? 0, icon: TrendingUp, cor: 'text-emerald-600', fundo: 'bg-emerald-500/10' },
    { label: 'Saídas', valor: rel?.totalDespesas ?? 0, icon: TrendingDown, cor: 'text-red-600', fundo: 'bg-red-500/10' },
    { label: 'A receber / a pagar', valor: rel?.totalPendente ?? 0, icon: Clock, cor: 'text-amber-600', fundo: 'bg-amber-500/10' },
    {
      label: 'Resultado',
      valor: rel?.saldo ?? 0,
      icon: Scale,
      cor: (rel?.saldo ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600',
      fundo: (rel?.saldo ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
  ];

  return (
    <div className="p-6 relatorio-print">
      <PageHeader
        title="Relatório financeiro"
        subtitle="Entradas por fonte, saídas por categoria e evolução do caixa"
        extra={
          <div className="print:hidden flex gap-2">
            <Button variant="outline" onClick={baixarCsv} disabled={baixando}>
              <Download className="mr-2 h-4 w-4" /> {baixando ? 'Gerando...' : 'CSV'}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        }
      />

      {/* Uma linha de filtros acima de tudo que ela afeta — nunca filtro por card. */}
      <Card className="mb-6 print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rInicio">De</Label>
              <Input id="rInicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rFim">Até</Label>
              <Input id="rFim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todas</SelectItem>
                  {Object.values(CategoriaLancamento).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LANCAMENTO_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Instituição</Label>
              <Select value={instituicaoId} onValueChange={setInstituicaoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todas</SelectItem>
                  {(instituicoesQ.data ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="hidden print:block text-sm mb-4">
        Período: {dayjs(dataInicio).format('DD/MM/YYYY')} a {dayjs(dataFim).format('DD/MM/YYYY')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {relatorioQ.isLoading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          : cards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${c.fundo} print:hidden`}>
                        <Icon className={`h-5 w-5 ${c.cor}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className={`text-lg font-bold ${c.cor}`}>{formatarValor(c.valor)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card className="break-inside-avoid">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-1">Entradas por fonte</h3>
            <p className="text-xs text-muted-foreground mb-4">
              As quatro fontes de receita da clínica, no período filtrado.
            </p>
            {relatorioQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <BarrasHorizontais
                dados={paraBarras(rel?.fontesReceita ?? [])}
                cor={COR_RECEITA}
                vazio="Nenhuma entrada recebida no período."
              />
            )}
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-1">Saídas por categoria</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Insumos, aluguel, contas fixas, compras e saídas esporádicas.
            </p>
            {relatorioQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <BarrasHorizontais
                dados={paraBarras(rel?.despesasPorCategoria ?? [], false)}
                cor={COR_DESPESA}
                vazio="Nenhuma saída paga no período."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4 break-inside-avoid">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-1">Evolução do caixa</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Mês a mês dentro do período, pela data em que o dinheiro entrou ou saiu.
          </p>
          {relatorioQ.isLoading ? <Skeleton className="h-48 w-full" /> : <EvolucaoMensal dados={rel?.serieMensal ?? []} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="break-inside-avoid">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4">Consultoria por instituição</h3>
            {(rel?.porInstituicao ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma receita de consultoria no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instituição</TableHead>
                    <TableHead className="text-right">Cobranças</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rel?.porInstituicao ?? []).map((i) => (
                    <TableRow key={i.instituicaoId}>
                      <TableCell className="font-medium">{i.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.quantidade}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatarValor(i.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4">Produtos mais vendidos</h3>
            {(rel?.produtosVendidos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma venda de produto no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rel?.produtosVendidos ?? []).map((p) => (
                    <TableRow key={p.produtoId}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantidade}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatarValor(p.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          @page { margin: 12mm; }
          .relatorio-print { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
