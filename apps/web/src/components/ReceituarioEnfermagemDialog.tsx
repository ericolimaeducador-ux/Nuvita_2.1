import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { produtosApi, receituarioEnfermagemApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { TipoProduto, type ItemReceituario } from '@/types';

const CATALOGO_LIVRE = '__livre__';

interface ItemForm {
  produtoId: string;
  nome: string;
  quantidade: string;
  instrucoesUso: string;
}

function itemVazio(): ItemForm {
  return { produtoId: CATALOGO_LIVRE, nome: '', quantidade: '1', instrucoesUso: '' };
}

export function ReceituarioEnfermagemDialog({
  pacienteId,
  feridaId,
  open,
  onOpenChange,
}: {
  pacienteId: string;
  feridaId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [itens, setItens] = useState<ItemForm[]>([itemVazio()]);
  const [observacoes, setObservacoes] = useState('');

  const produtosQ = useQuery({
    queryKey: ['produtos', 'curativo'],
    queryFn: () => produtosApi.list(),
    enabled: open,
  });
  const produtosCurativo = (produtosQ.data ?? []).filter((p) =>
    [TipoProduto.CURATIVO, TipoProduto.COBERTURA, TipoProduto.ADJUVANTE].includes(p.tipo) && p.ativo,
  );

  const mut = useMutation({
    mutationFn: () => {
      const payload: ItemReceituario[] = itens
        .filter((i) => i.nome.trim() && Number(i.quantidade) > 0)
        .map((i) => ({
          produtoId: i.produtoId === CATALOGO_LIVRE ? undefined : i.produtoId,
          nome: i.nome.trim(),
          quantidade: Number(i.quantidade),
          instrucoesUso: i.instrucoesUso.trim(),
        }));
      return receituarioEnfermagemApi.create({
        pacienteId,
        feridaId,
        itens: payload,
        observacoes: observacoes.trim() || undefined,
      });
    },
    onSuccess: (receituario) => {
      toast.success('Receituário emitido.');
      onOpenChange(false);
      setItens([itemVazio()]);
      setObservacoes('');
      window.open(`/pacientes/${pacienteId}/receituario/${receituario.id}/imprimir`, '_blank');
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function atualizarItem(idx: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((i, n) => (n === idx ? { ...i, ...patch } : i)));
  }

  function selecionarProduto(idx: number, produtoId: string) {
    if (produtoId === CATALOGO_LIVRE) {
      atualizarItem(idx, { produtoId, nome: '' });
      return;
    }
    const produto = produtosCurativo.find((p) => p.id === produtoId);
    atualizarItem(idx, { produtoId, nome: produto?.nome ?? '' });
  }

  const podeSubmeter = itens.some((i) => i.nome.trim() && Number(i.quantidade) > 0 && i.instrucoesUso.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setItens([itemVazio()]); setObservacoes(''); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Emitir receituário de enfermagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {itens.map((item, idx) => (
            <div key={idx} className="glass rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div className="space-y-1.5">
                  <Label>Item</Label>
                  <Select value={item.produtoId} onValueChange={(v) => selecionarProduto(idx, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CATALOGO_LIVRE}>Insumo fora do catálogo (digitar)</SelectItem>
                      {produtosCurativo.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {itens.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItens((prev) => prev.filter((_, n) => n !== idx))}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              {item.produtoId === CATALOGO_LIVRE && (
                <Input
                  placeholder="Nome do insumo"
                  value={item.nome}
                  onChange={(e) => atualizarItem(idx, { nome: e.target.value })}
                />
              )}
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <div className="space-y-1.5">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => atualizarItem(idx, { quantidade: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Instruções de uso</Label>
                  <Input
                    placeholder="Ex.: trocar a cada 48h, limpar com SF 0,9%..."
                    value={item.instrucoesUso}
                    onChange={(e) => atualizarItem(idx, { instrucoesUso: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItens((prev) => [...prev, itemVazio()])}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar item
          </Button>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!podeSubmeter || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Emitindo…' : 'Emitir receituário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
