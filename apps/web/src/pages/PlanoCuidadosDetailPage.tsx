import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { planosCuidadosApi } from '@/api/resources';
import { formatData } from '@/utils';
import {
  type AcaoPrescrita,
  type DecisaoEvolucao,
  type PrioridadeDiagnostico,
  type StatusDiagnostico,
  type TaxonomiaTermo,
  type UrgenciaAcao,
} from '@/types';

const PRIORIDADE_VARIANT: Record<PrioridadeDiagnostico, 'destructive' | 'secondary' | 'outline'> = {
  ALTA: 'destructive',
  MEDIA: 'secondary',
  BAIXA: 'outline',
};

const STATUS_DIAG_LABEL: Record<StatusDiagnostico, string> = {
  CONFIRMADO: 'Confirmado',
  HIPOTESE_PROVISORIA: 'Hipótese provisória',
};

const URGENCIA_LABEL: Record<UrgenciaAcao, string> = {
  IMEDIATA: 'Imediata',
  CURTO_PRAZO: 'Curto prazo',
  ROTINA: 'Rotina',
};

const DECISAO_LABEL: Record<DecisaoEvolucao, string> = {
  A: 'Manter diagnóstico e prescrição',
  B: 'Manter diagnóstico, modificar prescrição',
  C: 'Modificar diagnóstico e prescrição',
  D: 'Encerrar diagnóstico (meta atingida)',
};

const ORDEM_URGENCIA: UrgenciaAcao[] = ['IMEDIATA', 'CURTO_PRAZO', 'ROTINA'];

/**
 * Enquanto a licença CIPE® não chegar, o termo é do catálogo local e a tela
 * precisa dizer isso — não se apresenta ao usuário como taxonomia oficial.
 */
function ProcedenciaBadge({ taxonomia }: { taxonomia: TaxonomiaTermo }) {
  return taxonomia === 'CIPE_VALIDADO' ? (
    <Badge variant="outline">CIPE®</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      catálogo local (provisório)
    </Badge>
  );
}

export function PlanoCuidadosDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [relato, setRelato] = useState('');

  const planoQ = useQuery({
    queryKey: ['plano-cuidados', id],
    queryFn: () => planosCuidadosApi.buscar(id),
    enabled: !!id,
  });

  const evoluir = useMutation({
    mutationFn: () => planosCuidadosApi.evoluir(id, { relatoEvolucao: relato }),
    onSuccess: () => {
      setRelato('');
      queryClient.invalidateQueries({ queryKey: ['plano-cuidados', id] });
      toast({ title: 'Evolução registrada', description: 'A nota SOAP foi gerada; revise antes de usar.' });
    },
    onError: (e: unknown) => {
      const erro = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Não foi possível registrar a evolução',
        description: erro.response?.data?.message ?? 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  if (planoQ.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const plano = planoQ.data;
  if (!plano) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Plano de cuidados não encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const prescricoesOrdenadas = plano.prescricoes.flatMap((p) =>
    p.acoes.map((a) => ({ acao: a, diagnosticoRef: p.diagnosticoRef, orientacoes: p.orientacoesPacienteCuidador })),
  );

  return (
    <div className="p-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/planos-cuidados')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <PageHeader
        title={`Plano de cuidados — ${formatData(plano.criadoEm)}`}
        description={`${plano.diagnosticos.length} diagnóstico(s) · catálogo ${plano.versaoCatalogo}`}
      />

      <div className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        Plano gerado com apoio de IA. É <strong>rascunho</strong> e exige revisão do
        enfermeiro responsável antes de qualquer uso assistencial.
      </div>

      <Tabs defaultValue="diagnosticos">
        <TabsList>
          <TabsTrigger value="diagnosticos">Diagnósticos</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="prescricoes">Prescrições</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnosticos" className="mt-4 space-y-3">
          {plano.diagnosticos.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum diagnóstico foi produzido — o catálogo clínico pode não cobrir este quadro.
              </CardContent>
            </Card>
          )}
          {plano.diagnosticos.map((d) => (
            <Card key={d.codigoFenomeno}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={PRIORIDADE_VARIANT[d.prioridade]}>{d.prioridade}</Badge>
                  <Badge variant="secondary">{STATUS_DIAG_LABEL[d.status]}</Badge>
                  <ProcedenciaBadge taxonomia={d.taxonomia} />
                  <span className="text-xs text-muted-foreground">{d.codigoFenomeno}</span>
                </div>
                <CardTitle className="mt-2 text-base leading-snug">{d.enunciado}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {d.relacionadoA.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Relacionado a: </span>
                    {d.relacionadoA.join('; ')}
                  </p>
                )}
                {d.evidenciadoPor.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Evidenciado por: </span>
                    {d.evidenciadoPor.join('; ')}
                  </p>
                )}
                {d.raciocinioClinico && (
                  <p className="text-muted-foreground">{d.raciocinioClinico}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="resultados" className="mt-4 space-y-3">
          {plano.resultadosEsperados.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum resultado esperado definido.
              </CardContent>
            </Card>
          )}
          {plano.resultadosEsperados.map((r, i) => (
            <Card key={`${r.codigo}-${i}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ProcedenciaBadge taxonomia={r.taxonomia} />
                  <span className="text-xs text-muted-foreground">
                    {r.codigo} · para {r.diagnosticoRef}
                  </span>
                </div>
                <CardTitle className="mt-2 text-base">{r.titulo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-4">
                  <span>
                    <span className="text-muted-foreground">Baseline: </span>
                    <strong>{r.escoreBaseline}</strong>/5
                  </span>
                  <span>
                    <span className="text-muted-foreground">Meta: </span>
                    <strong>{r.escoreMeta}</strong>/5
                  </span>
                  <span>
                    <span className="text-muted-foreground">Prazo: </span>
                    {r.prazo}
                  </span>
                </div>
                {r.justificativaBaseline && (
                  <p className="text-muted-foreground">{r.justificativaBaseline}</p>
                )}
                {r.indicadores.length > 0 && (
                  <>
                    <Separator />
                    <ul className="space-y-2">
                      {r.indicadores.map((ind, j) => (
                        <li key={j}>
                          <span className="font-medium">{ind.descricao}</span>
                          <span className="text-muted-foreground">
                            {' '}— de {ind.valorBaseline} para {ind.valorMeta} ({ind.metodoAvaliacao},{' '}
                            {ind.frequencia})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="prescricoes" className="mt-4 space-y-6">
          {prescricoesOrdenadas.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma prescrição definida.
              </CardContent>
            </Card>
          )}
          {ORDEM_URGENCIA.map((urgencia) => {
            const doGrupo = prescricoesOrdenadas.filter((p) => p.acao.urgencia === urgencia);
            if (doGrupo.length === 0) return null;
            return (
              <div key={urgencia}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {URGENCIA_LABEL[urgencia]}
                </h3>
                <div className="space-y-3">
                  {doGrupo.map(({ acao, diagnosticoRef, orientacoes }, i) => (
                    <AcaoCard
                      key={`${acao.codigo}-${i}`}
                      acao={acao}
                      diagnosticoRef={diagnosticoRef}
                      orientacoes={orientacoes}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="evolucao" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrar evolução</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="relato">Relato do enfermeiro</Label>
              <Textarea
                id="relato"
                value={relato}
                onChange={(e) => setRelato(e.target.value)}
                placeholder="Como o paciente evoluiu desde a última avaliação? O que mudou na ferida, na dor, no autocuidado?"
                className="min-h-[140px]"
              />
              <Button
                onClick={() => evoluir.mutate()}
                disabled={relato.trim().length < 10 || evoluir.isPending}
              >
                {evoluir.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar evolução
              </Button>
              <p className="text-xs text-muted-foreground">
                Evolução gravada não pode ser editada nem apagada — a revisão se faz por
                nova evolução.
              </p>
            </CardContent>
          </Card>

          {plano.evolucoes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma evolução registrada.
              </CardContent>
            </Card>
          ) : (
            [...plano.evolucoes].reverse().map((ev, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{formatData(ev.data)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{ev.relatoTexto}</p>

                  {ev.decisoes.length > 0 && (
                    <>
                      <Separator />
                      <ul className="space-y-2">
                        {ev.decisoes.map((d, j) => (
                          <li key={j}>
                            <Badge variant="secondary" className="mr-2">
                              {d.decisao}
                            </Badge>
                            <span className="font-medium">{DECISAO_LABEL[d.decisao]}</span>
                            <span className="text-muted-foreground">
                              {' '}({d.diagnosticoRef}: {d.escoreAnterior} → {d.escoreAtual})
                            </span>
                            {d.justificativa && (
                              <p className="mt-1 text-muted-foreground">{d.justificativa}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <Separator />
                  <div className="space-y-1">
                    <p className="font-medium">Nota SOAP</p>
                    <p><strong>S:</strong> {ev.textoSoap.s}</p>
                    <p><strong>O:</strong> {ev.textoSoap.o}</p>
                    <p><strong>A:</strong> {ev.textoSoap.a}</p>
                    <p><strong>P:</strong> {ev.textoSoap.p}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="anamnese" className="mt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico clínico</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
              {plano.historicoTexto}
            </CardContent>
          </Card>
          {plano.exameFisicoTexto && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exame físico</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                {plano.exameFisicoTexto}
              </CardContent>
            </Card>
          )}
          {plano.hashIntegridade && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" />
                  Registro íntegro com trilha de auditoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="break-all font-mono text-xs">{plano.hashIntegridade}</p>
                <p>
                  Prova de integridade do registro no momento da geração. Não é assinatura
                  digital com validade jurídica plena.
                </p>
                {plano.auditoriaIa.length > 0 && (
                  <p>
                    {plano.auditoriaIa.length} chamada(s) ao motor de raciocínio ·{' '}
                    {plano.auditoriaIa[0].modelo}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AcaoCard({
  acao,
  diagnosticoRef,
  orientacoes,
}: {
  acao: AcaoPrescrita;
  diagnosticoRef: string;
  orientacoes: string[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{acao.tipo}</Badge>
          <ProcedenciaBadge taxonomia={acao.taxonomia} />
          <span className="text-xs text-muted-foreground">
            {acao.codigo} · para {diagnosticoRef}
          </span>
        </div>
        <CardTitle className="mt-2 text-base">{acao.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Button variant="outline" size="sm" onClick={() => setAberto((v) => !v)}>
          {aberto ? 'Ocultar' : `Ver ${acao.atividades.length} atividade(s)`}
        </Button>

        {aberto && (
          <ul className="space-y-2">
            {acao.atividades.map((at, i) => (
              <li key={i} className="rounded-md border p-2">
                <p className="font-medium">{at.descricao}</p>
                <p className="text-muted-foreground">
                  {at.frequencia} · {at.responsavel}
                </p>
              </li>
            ))}
          </ul>
        )}

        {acao.alertasReavaliacao.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
            <p className="font-medium">Reavaliar se:</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {acao.alertasReavaliacao.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {orientacoes.length > 0 && (
          <div>
            <p className="font-medium">Orientações ao paciente/cuidador</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {orientacoes.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
