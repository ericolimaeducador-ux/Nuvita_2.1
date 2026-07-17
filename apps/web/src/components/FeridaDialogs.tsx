import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { avaliacaoFeridaApi, feridasApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import {
  AchadoPerilesional, ACHADO_PERILESIONAL_LABEL,
  Etiologia, ETIOLOGIA_LABEL,
  NivelExsudato, NIVEL_EXSUDATO_LABEL,
} from '@/types';

export function NovaFeridaDialog({
  open, onOpenChange, pacienteId, clinicaId, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pacienteId: string;
  clinicaId?: string;
  onCreated: () => void;
}) {
  const { register, handleSubmit, watch, setValue, reset } = useForm<Record<string, unknown>>({
    defaultValues: { etiologia: Etiologia.DESCONHECIDA },
  });

  const mut = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      feridasApi.create({
        clinicaId,
        pacienteId,
        rotulo: v.rotulo as string,
        etiologia: v.etiologia as Etiologia,
        localizacao: v.localizacao as string,
        dataInicio: (v.dataInicio as string) || undefined,
        observacoes: (v.observacoes as string) || undefined,
      }),
    onSuccess: () => {
      toast.success('Ferida registrada.');
      onOpenChange(false);
      reset();
      onCreated();
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova ferida</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4">
          <div className="space-y-1">
            <Label>Rótulo</Label>
            <Input placeholder="Ex: Calcâneo direito" {...register('rotulo', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Etiologia</Label>
              <Select value={(watch('etiologia') as string)} onValueChange={(v) => setValue('etiologia', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(Etiologia).map((e) => (
                    <SelectItem key={e} value={e}>{ETIOLOGIA_LABEL[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data de início</Label>
              <Input type="date" {...register('dataInicio')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Localização</Label>
            <Input placeholder="Ex: Calcâneo direito, região sacral" {...register('localizacao', { required: true })} />
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea {...register('observacoes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Salvando...' : 'Registrar ferida'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NovaAvaliacaoFeridaDialog({
  open, onOpenChange, feridaId, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  feridaId: string;
  onCreated: () => void;
}) {
  const { register, handleSubmit, watch, setValue, reset } = useForm<Record<string, unknown>>({
    defaultValues: { exsudato: NivelExsudato.NENHUM, escalaDor: 0 },
  });
  const [achados, setAchados] = useState<AchadoPerilesional[]>([]);

  const somaTecido = useMemo(() => {
    const n = (v: unknown) => Number(v) || 0;
    return n(watch('granulacaoPct')) + n(watch('epitelizacaoPct')) + n(watch('esfaceloPct')) + n(watch('necrosePct'));
  }, [watch('granulacaoPct'), watch('epitelizacaoPct'), watch('esfaceloPct'), watch('necrosePct')]);

  function toggleAchado(a: AchadoPerilesional) {
    setAchados((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  const mut = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      if (somaTecido > 100) throw new Error('A soma dos percentuais de tecido não pode exceder 100.');
      return avaliacaoFeridaApi.create(feridaId, {
        medicao: {
          comprimentoCm: Number(v.comprimentoCm),
          larguraCm: Number(v.larguraCm),
          profundidadeCm: Number(v.profundidadeCm),
        },
        tecido: {
          granulacaoPct: Number(v.granulacaoPct) || 0,
          epitelizacaoPct: Number(v.epitelizacaoPct) || 0,
          esfaceloPct: Number(v.esfaceloPct) || 0,
          necrosePct: Number(v.necrosePct) || 0,
        },
        exsudato: v.exsudato as NivelExsudato,
        escalaDor: Number(v.escalaDor) || 0,
        odor: !!v.odor,
        achadosPerilesionais: achados,
        sinaisSistemicos: !!v.sinaisSistemicos,
        perfusaoRuim: !!v.perfusaoRuim,
        ossoOuTendaoExposto: !!v.ossoOuTendaoExposto,
        pioraAreaPct30Dias: v.pioraAreaPct30Dias ? Number(v.pioraAreaPct30Dias) : undefined,
        diasCicatrizacaoEstagnada: v.diasCicatrizacaoEstagnada ? Number(v.diasCicatrizacaoEstagnada) : undefined,
      });
    },
    onSuccess: (avaliacao) => {
      const risco = avaliacao.recomendacoes[0]?.risco;
      toast.success('Avaliação registrada.', risco ? `Maior risco identificado: ${risco}.` : undefined);
      onOpenChange(false);
      reset();
      setAchados([]);
      onCreated();
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova avaliação de ferida</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Comprimento (cm)</Label>
              <Input type="number" step="0.1" {...register('comprimentoCm', { required: true, valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label>Largura (cm)</Label>
              <Input type="number" step="0.1" {...register('larguraCm', { required: true, valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label>Profundidade (cm)</Label>
              <Input type="number" step="0.1" {...register('profundidadeCm', { required: true, valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className={somaTecido > 100 ? 'text-destructive' : undefined}>
              Perfil tecidual (%) — soma: {somaTecido}{somaTecido > 100 ? ' (excede 100!)' : ''}
            </Label>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Granulação</Label>
                <Input type="number" {...register('granulacaoPct', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Epitelização</Label>
                <Input type="number" {...register('epitelizacaoPct', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Esfacelo</Label>
                <Input type="number" {...register('esfaceloPct', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Necrose</Label>
                <Input type="number" {...register('necrosePct', { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Exsudato</Label>
              <Select value={(watch('exsudato') as string)} onValueChange={(v) => setValue('exsudato', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(NivelExsudato).map((n) => (
                    <SelectItem key={n} value={n}>{NIVEL_EXSUDATO_LABEL[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Escala de dor (0-10)</Label>
              <Input type="number" min={0} max={10} {...register('escalaDor', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Achados perilesionais</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(AchadoPerilesional).map((a) => (
                <div key={a} className="flex items-center gap-2">
                  <Checkbox id={`ach_${a}`} checked={achados.includes(a)} onCheckedChange={() => toggleAchado(a)} />
                  <Label htmlFor={`ach_${a}`} className="text-sm cursor-pointer">{ACHADO_PERILESIONAL_LABEL[a]}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox id="af_odor" checked={!!watch('odor')} onCheckedChange={(c) => setValue('odor', !!c)} />
              <Label htmlFor="af_odor" className="cursor-pointer">Odor presente</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="af_sistemicos" checked={!!watch('sinaisSistemicos')} onCheckedChange={(c) => setValue('sinaisSistemicos', !!c)} />
              <Label htmlFor="af_sistemicos" className="cursor-pointer">Sinais sistêmicos (febre, mal-estar...)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="af_perfusao" checked={!!watch('perfusaoRuim')} onCheckedChange={(c) => setValue('perfusaoRuim', !!c)} />
              <Label htmlFor="af_perfusao" className="cursor-pointer">Perfusão ruim</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="af_osso" checked={!!watch('ossoOuTendaoExposto')} onCheckedChange={(c) => setValue('ossoOuTendaoExposto', !!c)} />
              <Label htmlFor="af_osso" className="cursor-pointer">Osso ou tendão exposto</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Piora de área nos últimos 30 dias (%)</Label>
              <Input type="number" placeholder="Opcional" {...register('pioraAreaPct30Dias', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label>Dias sem progresso de cicatrização</Label>
              <Input type="number" placeholder="Opcional" {...register('diasCicatrizacaoEstagnada', { valueAsNumber: true })} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending || somaTecido > 100}>
              {mut.isPending ? 'Salvando...' : 'Registrar avaliação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
