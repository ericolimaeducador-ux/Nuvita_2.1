import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { termosConsentimentoApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { TipoTermo } from '@/types';

/**
 * Fluxo de assinatura digital do TCLE: mostra o texto legal na tela, o
 * paciente (ou responsável) digita o próprio nome completo para confirmar
 * identidade, e a assinatura vira hash com timestamp no servidor — nada em
 * papel. Se já existir um rascunho não assinado deste tipo, reaproveita em
 * vez de criar outro (evita termos órfãos de tentativas anteriores).
 */
export function TermoConsentimentoDialog({
  pacienteId,
  open,
  onOpenChange,
}: {
  pacienteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [nomeAssinante, setNomeAssinante] = useState('');

  const listQ = useQuery({
    queryKey: ['termos-consentimento', pacienteId],
    queryFn: () => termosConsentimentoApi.listByPaciente(pacienteId),
    enabled: open,
  });

  const rascunhoExistente = listQ.data?.find((t) => t.tipo === TipoTermo.FOTOGRAFIA_PESQUISA && !t.assinatura);

  const criarMut = useMutation({
    mutationFn: () => termosConsentimentoApi.create({ pacienteId, tipo: TipoTermo.FOTOGRAFIA_PESQUISA }),
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const termo = rascunhoExistente ?? criarMut.data;

  const assinarMut = useMutation({
    mutationFn: (termoId: string) => termosConsentimentoApi.assinar(termoId, nomeAssinante.trim()),
    onSuccess: (assinado) => {
      toast.success('Termo assinado.');
      onOpenChange(false);
      setNomeAssinante('');
      window.open(`/pacientes/${pacienteId}/termos/${assinado.id}/imprimir`, '_blank');
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  // O diálogo é 100% controlado pelo `open` prop (sem DialogTrigger) — o Radix
  // só chama onOpenChange para fechar (ESC/overlay), nunca para abrir. Por
  // isso o rascunho precisa ser criado aqui, reagindo à mudança do prop, e não
  // dentro de um onOpenChange (que nunca dispararia com `o === true`).
  useEffect(() => {
    if (!open || listQ.isLoading) return;
    if (rascunhoExistente || criarMut.data || criarMut.isPending) return;
    criarMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listQ.isLoading, rascunhoExistente]);

  function handleOpenChange(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setNomeAssinante('');
      criarMut.reset();
    }
  }

  const carregando = listQ.isLoading || (!termo && criarMut.isPending);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Termo de Consentimento — Fotografia e Pesquisa</DialogTitle>
          <DialogDescription>
            Leia o termo com o paciente (ou responsável legal) e peça que digite o nome completo abaixo para confirmar.
          </DialogDescription>
        </DialogHeader>
        {carregando ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto rounded-lg border p-4 text-sm whitespace-pre-line bg-muted/30">
              {termo?.texto}
            </div>
            <div className="space-y-1.5">
              <Label>Nome completo do assinante</Label>
              <Input
                value={nomeAssinante}
                onChange={(e) => setNomeAssinante(e.target.value)}
                placeholder="Digite o nome completo aqui"
              />
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!termo || nomeAssinante.trim().length < 3 || assinarMut.isPending}
            onClick={() => termo && assinarMut.mutate(termo.id)}
          >
            {assinarMut.isPending ? 'Assinando…' : 'Assinar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
