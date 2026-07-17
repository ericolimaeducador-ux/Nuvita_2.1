import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Camera } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { feridasApi, avaliacaoFeridaApi, documentosApi, pacientesApi } from '@/api/resources';
import { NovaAvaliacaoFeridaDialog } from '@/components/FeridaDialogs';
import { NovoDocumentoDialog } from '@/components/NovoDocumentoDialog';
import { formatData, toItems } from '@/utils';
import {
  ETIOLOGIA_LABEL, STATUS_FERIDA_LABEL, NIVEL_RISCO_LABEL, TipoDocumento, NivelRisco, type Documento,
} from '@/types';

const RISCO_VARIANT: Record<NivelRisco, 'success' | 'warning' | 'destructive'> = {
  [NivelRisco.BAIXO]: 'success',
  [NivelRisco.MODERADO]: 'warning',
  [NivelRisco.ALTO]: 'destructive',
  [NivelRisco.URGENTE]: 'destructive',
};

const TENDENCIA_LABEL: Record<string, string> = {
  melhorando: 'Melhorando',
  piorando: 'Piorando',
  estavel: 'Estável',
};

export function FeridaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [novaAvaliacaoOpen, setNovaAvaliacaoOpen] = useState(false);
  const [novaFotoOpen, setNovaFotoOpen] = useState(false);

  const feridaQ = useQuery({ queryKey: ['ferida', id], queryFn: () => feridasApi.get(id!), enabled: !!id });
  const avaliacoesQ = useQuery({
    queryKey: ['avaliacoes-ferida', id],
    queryFn: () => avaliacaoFeridaApi.listByFerida(id!),
    enabled: !!id,
  });
  const timelineQ = useQuery({ queryKey: ['ferida-timeline', id], queryFn: () => feridasApi.timeline(id!), enabled: !!id });
  const fotosQ = useQuery({
    queryKey: ['documentos', 'ferida', id],
    queryFn: () => documentosApi.list({ feridaId: id }),
    enabled: !!id,
  });
  const fotos = toItems<Documento>(fotosQ.data as never);

  const paciente = feridaQ.data?.pacienteId;
  const pacienteQ = useQuery({
    queryKey: ['paciente', paciente],
    queryFn: () => pacientesApi.get(paciente!),
    enabled: !!paciente,
  });

  function refetchTudo() {
    void qc.invalidateQueries({ queryKey: ['avaliacoes-ferida', id] });
    void qc.invalidateQueries({ queryKey: ['ferida-timeline', id] });
  }

  if (feridaQ.isLoading || !feridaQ.data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const ferida = feridaQ.data;
  const avaliacoes = [...(avaliacoesQ.data ?? [])].reverse(); // mais recente primeiro na listagem

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <PageHeader
        title={ferida.rotulo}
        description={`${ETIOLOGIA_LABEL[ferida.etiologia]} — ${ferida.localizacao}`}
        extra={
          <>
            <Button variant="outline" onClick={() => setNovaFotoOpen(true)}>
              <Camera className="mr-2 h-4 w-4" /> Adicionar foto
            </Button>
            <Button onClick={() => setNovaAvaliacaoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova avaliação
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-lg font-semibold">{STATUS_FERIDA_LABEL[ferida.status]}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Paciente</p>
          <p className="text-lg font-semibold">
            {pacienteQ.data ? (
              <Link to={`/pacientes/${ferida.pacienteId}`} className="hover:underline">{pacienteQ.data.nome}</Link>
            ) : '—'}
          </p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Tendência (área)</p>
          <p className="text-lg font-semibold">
            {timelineQ.data ? TENDENCIA_LABEL[timelineQ.data.tendencia.status] : '—'}
          </p>
        </CardContent></Card>
      </div>

      {ferida.observacoes && (
        <Card className="mb-6"><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground mb-1">Observações</p>
          <p className="text-sm">{ferida.observacoes}</p>
        </CardContent></Card>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold mb-4">Fotos</h2>
          {fotosQ.isLoading ? <Skeleton className="h-20 w-full" /> : (
            <div className="flex flex-wrap gap-3">
              {fotos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma foto anexada ainda.</p>
              )}
              {fotos.map((doc) => (
                <div key={doc.id} className="w-24 h-24 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground overflow-hidden">
                  {doc.nome}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold mb-4">Avaliações</h2>
          {avaliacoesQ.isLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="space-y-3">
              {avaliacoes.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">Nenhuma avaliação registrada ainda.</p>
              )}
              {avaliacoes.map((a) => (
                <div key={a.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{formatData(a.criadoEm)}</span>
                    <Badge variant={RISCO_VARIANT[a.recomendacoes[0]?.risco ?? NivelRisco.BAIXO]}>
                      {NIVEL_RISCO_LABEL[a.recomendacoes[0]?.risco ?? NivelRisco.BAIXO]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {a.medicao.comprimentoCm}×{a.medicao.larguraCm}×{a.medicao.profundidadeCm}cm
                    {a.medicao.areaCm2 !== undefined && ` (área: ${a.medicao.areaCm2}cm²)`}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {a.recomendacoes.map((r) => (
                      <li key={r.regraId} className="text-sm">
                        <span className="font-medium">{r.titulo}:</span> {r.acao}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {id && (
        <NovaAvaliacaoFeridaDialog
          open={novaAvaliacaoOpen}
          onOpenChange={setNovaAvaliacaoOpen}
          feridaId={id}
          onCreated={refetchTudo}
        />
      )}
      {id && (
        <NovoDocumentoDialog
          pacienteId={ferida.pacienteId}
          pacienteNome={pacienteQ.data?.nome}
          open={novaFotoOpen}
          onOpenChange={setNovaFotoOpen}
          feridaId={id}
          tipoInicial={TipoDocumento.FOTO_FERIDA}
          aceitarSomenteImagem
        />
      )}
    </div>
  );
}
