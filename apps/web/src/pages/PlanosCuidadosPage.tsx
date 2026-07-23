import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { pacientesApi, planosCuidadosApi } from '@/api/resources';
import { toItems, formatData } from '@/utils';
import {
  type ContextoEstomaterapia,
  type NivelCuidado,
  type Paciente,
  type StatusPlano,
} from '@/types';

const STATUS_VARIANT: Record<StatusPlano, 'default' | 'success' | 'secondary'> = {
  ativo: 'default',
  encerrado: 'success',
  suspenso: 'secondary',
};

const STATUS_LABEL: Record<StatusPlano, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  suspenso: 'Suspenso',
};

const CONTEXTOS: { valor: ContextoEstomaterapia; label: string }[] = [
  { valor: 'ferida_cronica', label: 'Ferida crônica' },
  { valor: 'ferida_aguda', label: 'Ferida aguda' },
  { valor: 'lesao_pressao', label: 'Lesão por pressão' },
  { valor: 'estoma_colostomia', label: 'Colostomia' },
  { valor: 'estoma_ileostomia', label: 'Ileostomia' },
  { valor: 'estoma_urostomia', label: 'Urostomia' },
  { valor: 'incontinencia', label: 'Incontinência' },
  { valor: 'fistula', label: 'Fístula' },
];

const NIVEIS: { valor: NivelCuidado; label: string }[] = [
  { valor: 'ambulatorio', label: 'Ambulatório' },
  { valor: 'domicilio', label: 'Domicílio' },
  { valor: 'enfermaria', label: 'Enfermaria' },
  { valor: 'uti', label: 'UTI' },
];

/**
 * A geração encadeia quatro chamadas ao motor de raciocínio e leva dezenas de
 * segundos. Sem sinal de progresso a tela parece travada — as mensagens são
 * cronometradas, não vêm do backend.
 */
const ETAPAS = [
  { ate: 6_000, texto: 'Lendo o histórico clínico...' },
  { ate: 16_000, texto: 'Identificando fenômenos clínicos no catálogo...' },
  { ate: 28_000, texto: 'Definindo resultados esperados e metas...' },
  { ate: Infinity, texto: 'Prescrevendo intervenções de enfermagem...' },
];

function useMensagemProgresso(ativo: boolean): string {
  const [decorrido, setDecorrido] = useState(0);

  useEffect(() => {
    if (!ativo) {
      setDecorrido(0);
      return;
    }
    const inicio = Date.now();
    const t = setInterval(() => setDecorrido(Date.now() - inicio), 500);
    return () => clearInterval(t);
  }, [ativo]);

  return ETAPAS.find((e) => decorrido < e.ate)!.texto;
}

export function PlanosCuidadosPage() {
  const navigate = useNavigate();
  const [pacienteId, setPacienteId] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [historicoTexto, setHistorico] = useState('');
  const [exameFisicoTexto, setExame] = useState('');
  const [contexto, setContexto] = useState<ContextoEstomaterapia>('ferida_cronica');
  const [nivel, setNivel] = useState<NivelCuidado>('ambulatorio');

  const pacientesQ = useQuery({
    queryKey: ['pacientes', 'select'],
    queryFn: () => pacientesApi.list({ limit: 100 }),
  });
  const pacientes = toItems<Paciente>(pacientesQ.data as never);

  const planosQ = useQuery({
    queryKey: ['planos-cuidados', pacienteId],
    queryFn: () => planosCuidadosApi.listarPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });

  const gerar = useMutation({
    mutationFn: () =>
      planosCuidadosApi.gerar({
        pacienteId,
        historicoTexto,
        exameFisicoTexto: exameFisicoTexto || undefined,
        contextoEstomaterapia: contexto,
        nivelCuidado: nivel,
      }),
    onSuccess: (plano) => {
      toast({ title: 'Plano gerado', description: 'Revise antes de usar no atendimento.' });
      navigate(`/planos-cuidados/${plano.id}`);
    },
    onError: (e: unknown) => {
      const erro = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Não foi possível gerar o plano',
        description: erro.response?.data?.message ?? 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  const mensagem = useMensagemProgresso(gerar.isPending);
  const podeGerar = !!pacienteId && historicoTexto.trim().length >= 20 && !gerar.isPending;

  return (
    <div className="p-6">
      <PageHeader
        title="Planos de cuidados"
        description="Diagnóstico, resultado esperado e prescrição de enfermagem, com apoio de IA e revisão obrigatória."
        extra={
          <Button onClick={() => setFormAberto((v) => !v)} disabled={!pacienteId}>
            <Plus className="mr-2 h-4 w-4" />
            Novo plano
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Label className="mb-2 block">Paciente</Label>
          <Select value={pacienteId} onValueChange={setPacienteId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Selecione o paciente" />
            </SelectTrigger>
            <SelectContent>
              {pacientes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {formAberto && pacienteId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Anamnese</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="historico" className="mb-2 block">
                Histórico clínico <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="historico"
                value={historicoTexto}
                onChange={(e) => setHistorico(e.target.value)}
                placeholder="Idade, comorbidades, tempo de evolução, queixa principal, mobilidade, hábitos..."
                className="min-h-[180px]"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {historicoTexto.trim().length < 20
                  ? 'Mínimo de 20 caracteres.'
                  : `${historicoTexto.trim().length} caracteres`}
              </p>
            </div>

            <div>
              <Label htmlFor="exame" className="mb-2 block">
                Exame físico
              </Label>
              <Textarea
                id="exame"
                value={exameFisicoTexto}
                onChange={(e) => setExame(e.target.value)}
                placeholder="Localização e dimensões da ferida, tipo de tecido, exsudato, bordas, pele perilesional, sinais vitais..."
                className="min-h-[180px]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">Contexto</Label>
                <Select value={contexto} onValueChange={(v) => setContexto(v as ContextoEstomaterapia)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTEXTOS.map((c) => (
                      <SelectItem key={c.valor} value={c.valor}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Nível de cuidado</Label>
                <Select value={nivel} onValueChange={(v) => setNivel(v as NivelCuidado)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEIS.map((n) => (
                      <SelectItem key={n.valor} value={n.valor}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
              O texto informado é enviado a um serviço de IA para apoiar o raciocínio
              clínico. O plano gerado é <strong>rascunho</strong> e exige revisão do
              enfermeiro responsável antes de qualquer uso assistencial.
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => gerar.mutate()} disabled={!podeGerar}>
                {gerar.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Gerar plano
              </Button>
              {gerar.isPending && <span className="text-sm text-muted-foreground">{mensagem}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {!pacienteId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecione um paciente para ver os planos de cuidados.
          </CardContent>
        </Card>
      ) : planosQ.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (planosQ.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum plano de cuidados para este paciente ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(planosQ.data ?? []).map((plano) => (
            <Card
              key={plano.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => navigate(`/planos-cuidados/${plano.id}`)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatData(plano.criadoEm)}</span>
                    <Badge variant={STATUS_VARIANT[plano.status]}>
                      {STATUS_LABEL[plano.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plano.diagnosticos.length} diagnóstico(s) · {plano.evolucoes.length} evolução(ões)
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Abrir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
