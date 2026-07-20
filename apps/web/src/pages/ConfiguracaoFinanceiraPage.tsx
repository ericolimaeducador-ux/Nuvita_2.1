import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, Power } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { financeiroApi, produtosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { formatarValor } from '@/components/charts/FinanceiroCharts';
import {
  CATEGORIA_LANCAMENTO_LABEL,
  CATEGORIAS_DESPESA,
  CategoriaLancamento,
  TIPO_INSTITUICAO_LABEL,
  TIPO_PRODUTO_LABEL,
  TIPO_SERVICO_LABEL,
  TipoInstituicao,
  TipoLancamento,
  TipoProduto,
  TipoServico,
} from '@/types';

/**
 * Configuração financeira: tabela de preços, catálogo de produtos, clientes
 * institucionais e recorrências. Tudo aqui é cadastro do ADMIN — nenhuma destas
 * listas é fixa no código, para reajuste de preço não depender de deploy.
 */
export function ConfiguracaoFinanceiraPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Configuração financeira"
        subtitle="Preços dos serviços, produtos, clientes institucionais e cobranças recorrentes"
      />
      <Tabs defaultValue="servicos">
        <TabsList className="mb-4">
          <TabsTrigger value="servicos">Tabela de preços</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="instituicoes">Instituições</TabsTrigger>
          <TabsTrigger value="recorrencias">Recorrências</TabsTrigger>
        </TabsList>
        <TabsContent value="servicos"><AbaServicos /></TabsContent>
        <TabsContent value="produtos"><AbaProdutos /></TabsContent>
        <TabsContent value="instituicoes"><AbaInstituicoes /></TabsContent>
        <TabsContent value="recorrencias"><AbaRecorrencias /></TabsContent>
      </Tabs>
    </div>
  );
}

function Carregando() {
  return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}

// ---------- Tabela de preços ----------

function AbaServicos() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoServico>(TipoServico.CONSULTA);
  const [preco, setPreco] = useState('');

  const q = useQuery({ queryKey: ['financeiro', 'servicos', 'todos'], queryFn: () => financeiroApi.listServicos(true) });

  const criar = useMutation({
    mutationFn: () => financeiroApi.createServico({ nome, tipo, preco: parseFloat(preco) }),
    onSuccess: () => {
      toast.success('Serviço cadastrado.');
      setAberto(false); setNome(''); setPreco('');
      void qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const alternar = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => financeiroApi.updateServico(id, { ativo }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['financeiro'] }),
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            O preço aqui pré-preenche o lançamento e continua editável na hora da cobrança.
          </p>
          <Button size="sm" onClick={() => setAberto(true)}><Plus className="mr-2 h-4 w-4" /> Novo serviço</Button>
        </div>

        {q.isLoading ? <Carregando /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell>{TIPO_SERVICO_LABEL[s.tipo] ?? s.tipo}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatarValor(s.preco)}</TableCell>
                  <TableCell>
                    <Badge variant={s.ativo ? 'success' : 'secondary'}>{s.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" title={s.ativo ? 'Desativar' : 'Reativar'}
                      onClick={() => alternar.mutate({ id: s.id, ativo: !s.ativo })}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(q.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum serviço cadastrado. Comece por "Consulta" e "Avaliação avulsa de ferida".
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo serviço</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sNome">Nome</Label>
                <Input id="sNome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Consulta presencial" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoServico)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TipoServico).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_SERVICO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sPreco">Preço (R$)</Label>
                <Input id="sPreco" type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button onClick={() => criar.mutate()} disabled={!nome || !preco || criar.isPending}>
                {criar.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ---------- Catálogo de produtos ----------

function AbaProdutos() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoProduto>(TipoProduto.COBERTURA);
  const [precoVenda, setPrecoVenda] = useState('');
  const [custo, setCusto] = useState('');
  const [apresentacao, setApresentacao] = useState('');

  const q = useQuery({ queryKey: ['produtos'], queryFn: () => produtosApi.list() });

  const criar = useMutation({
    mutationFn: () => produtosApi.create({
      nome, tipo, precoVenda: parseFloat(precoVenda),
      custo: custo ? parseFloat(custo) : undefined,
      apresentacao: apresentacao || undefined,
    }),
    onSuccess: () => {
      toast.success('Produto cadastrado.');
      setAberto(false); setNome(''); setPrecoVenda(''); setCusto(''); setApresentacao('');
      void qc.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const desativar = useMutation({
    mutationFn: (id: string) => produtosApi.desativar(id),
    onSuccess: () => { toast.success('Produto desativado.'); void qc.invalidateQueries({ queryKey: ['produtos'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Curativos, coberturas, bolsas e adjuvantes que a clínica revende ao paciente.
          </p>
          <Button size="sm" onClick={() => setAberto(true)}><Plus className="mr-2 h-4 w-4" /> Novo produto</Button>
        </div>

        {q.isLoading ? <Carregando /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Venda</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.nome}
                    {p.apresentacao && <span className="text-muted-foreground"> · {p.apresentacao}</span>}
                  </TableCell>
                  <TableCell>{TIPO_PRODUTO_LABEL[p.tipo] ?? p.tipo}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatarValor(p.precoVenda)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.custo != null ? formatarValor(p.custo) : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.custo != null && p.custo > 0
                      ? `${(((p.precoVenda - p.custo) / p.custo) * 100).toFixed(0)}%`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" title="Desativar" onClick={() => desativar.mutate(p.id)}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(q.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum produto cadastrado.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo produto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pNome">Nome</Label>
                <Input id="pNome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Espuma de prata" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoProduto)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TipoProduto).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_PRODUTO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pApres">Apresentação</Label>
                <Input id="pApres" value={apresentacao} onChange={(e) => setApresentacao(e.target.value)} placeholder="10x10cm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pVenda">Preço de venda (R$)</Label>
                  <Input id="pVenda" type="number" min="0" step="0.01" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pCusto">Custo (R$)</Label>
                  <Input id="pCusto" type="number" min="0" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button onClick={() => criar.mutate()} disabled={!nome || !precoVenda || criar.isPending}>
                {criar.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ---------- Clientes institucionais ----------

function AbaInstituicoes() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoInstituicao>(TipoInstituicao.ILPI);
  const [cnpj, setCnpj] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [contatoTelefone, setContatoTelefone] = useState('');

  const q = useQuery({
    queryKey: ['financeiro', 'instituicoes', 'todas'],
    queryFn: () => financeiroApi.listInstituicoes(true),
  });

  const criar = useMutation({
    mutationFn: () => financeiroApi.createInstituicao({
      nome, tipo, cnpj: cnpj || undefined,
      contatoNome: contatoNome || undefined,
      contatoTelefone: contatoTelefone || undefined,
    }),
    onSuccess: () => {
      toast.success('Instituição cadastrada.');
      setAberto(false); setNome(''); setCnpj(''); setContatoNome(''); setContatoTelefone('');
      void qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Hospitais, clínicas e ILPIs atendidos por consultoria.
          </p>
          <Button size="sm" onClick={() => setAberto(true)}><Plus className="mr-2 h-4 w-4" /> Nova instituição</Button>
        </div>

        {q.isLoading ? <Carregando /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instituição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell>{TIPO_INSTITUICAO_LABEL[i.tipo] ?? i.tipo}</TableCell>
                  <TableCell className="tabular-nums">{i.cnpj ?? '—'}</TableCell>
                  <TableCell>{i.contatoNome ?? '—'}</TableCell>
                </TableRow>
              ))}
              {(q.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma instituição cadastrada.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova instituição</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="iNome">Nome</Label>
                <Input id="iNome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoInstituicao)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TipoInstituicao).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_INSTITUICAO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="iCnpj">CNPJ</Label>
                <Input id="iCnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="iContato">Contato</Label>
                  <Input id="iContato" value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iTel">Telefone</Label>
                  <Input id="iTel" value={contatoTelefone} onChange={(e) => setContatoTelefone(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button onClick={() => criar.mutate()} disabled={!nome || criar.isPending}>
                {criar.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ---------- Recorrências ----------

function AbaRecorrencias() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoLancamento>(TipoLancamento.DESPESA);
  const [categoria, setCategoria] = useState<CategoriaLancamento>(CategoriaLancamento.ALUGUEL);
  const [instituicaoId, setInstituicaoId] = useState('');
  const [valorMensal, setValorMensal] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('5');
  const [inicio, setInicio] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));

  const q = useQuery({ queryKey: ['financeiro', 'recorrencias'], queryFn: () => financeiroApi.listRecorrencias() });
  const instituicoesQ = useQuery({
    queryKey: ['financeiro', 'instituicoes'],
    queryFn: () => financeiroApi.listInstituicoes(),
  });

  const ehConsultoria = categoria === CategoriaLancamento.CONSULTORIA;

  const criar = useMutation({
    mutationFn: () => financeiroApi.createRecorrencia({
      descricao, tipo, categoria,
      instituicaoId: ehConsultoria ? instituicaoId : undefined,
      valorMensal: parseFloat(valorMensal),
      diaVencimento: parseInt(diaVencimento, 10),
      inicio: dayjs(inicio).toISOString(),
    }),
    onSuccess: () => {
      toast.success('Recorrência criada. As competências em aberto já foram geradas.');
      setAberto(false); setDescricao(''); setValorMensal(''); setInstituicaoId('');
      void qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const alternar = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => financeiroApi.updateRecorrencia(id, { ativo }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['financeiro'] }),
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  // Receita recorrente hoje = contrato de consultoria; despesa = aluguel/conta fixa.
  const categoriasDisponiveis =
    tipo === TipoLancamento.RECEITA ? [CategoriaLancamento.CONSULTORIA] : CATEGORIAS_DESPESA;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Contratos de consultoria, aluguel e contas fixas. O lançamento de cada mês é gerado automaticamente.
          </p>
          <Button size="sm" onClick={() => setAberto(true)}><Plus className="mr-2 h-4 w-4" /> Nova recorrência</Button>
        </div>

        {q.isLoading ? <Carregando /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor/mês</TableHead>
                <TableHead>Vence dia</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.descricao}</TableCell>
                  <TableCell>
                    <Badge variant={r.tipo === TipoLancamento.RECEITA ? 'success' : 'destructive'}>
                      {CATEGORIA_LANCAMENTO_LABEL[r.categoria] ?? r.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatarValor(r.valorMensal)}</TableCell>
                  <TableCell className="tabular-nums">{r.diaVencimento}</TableCell>
                  <TableCell>{dayjs(r.inicio).format('MM/YYYY')}</TableCell>
                  <TableCell>
                    <Badge variant={r.ativo ? 'success' : 'secondary'}>{r.ativo ? 'Ativa' : 'Encerrada'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" title={r.ativo ? 'Encerrar' : 'Reativar'}
                      onClick={() => alternar.mutate({ id: r.id, ativo: !r.ativo })}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(q.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma recorrência cadastrada.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova recorrência</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rDesc">Descrição</Label>
                <Input id="rDesc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Aluguel da sala" />
              </div>
              <div className="space-y-2">
                <Label>Entrada ou saída</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => {
                    const novo = v as TipoLancamento;
                    setTipo(novo);
                    setCategoria(novo === TipoLancamento.RECEITA ? CategoriaLancamento.CONSULTORIA : CategoriaLancamento.ALUGUEL);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TipoLancamento.RECEITA}>Entrada (contrato de consultoria)</SelectItem>
                    <SelectItem value={TipoLancamento.DESPESA}>Saída (aluguel, conta fixa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaLancamento)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoriasDisponiveis.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORIA_LANCAMENTO_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {ehConsultoria && (
                <div className="space-y-2">
                  <Label>Instituição contratante</Label>
                  <Select value={instituicaoId} onValueChange={setInstituicaoId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(instituicoesQ.data ?? []).map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rValor">Valor mensal (R$)</Label>
                  <Input id="rValor" type="number" min="0" step="0.01" value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rDia">Vence no dia</Label>
                  <Input id="rDia" type="number" min="1" max="28" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rInicio">Início da vigência</Label>
                <Input id="rInicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Início retroativo gera de uma vez todos os meses em aberto até hoje.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button
                onClick={() => criar.mutate()}
                disabled={!descricao || !valorMensal || (ehConsultoria && !instituicaoId) || criar.isPending}
              >
                {criar.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
