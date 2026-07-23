import { useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Camera, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { feridasApi, avaliacaoFeridaApi, documentosApi, pacientesApi } from '@/api/resources';
import { NovaAvaliacaoFeridaDialog } from '@/components/FeridaDialogs';
import { NovoDocumentoDialog } from '@/components/NovoDocumentoDialog';
import { formatData, toItems } from '@/utils';
import {
  ETIOLOGIA_LABEL, STATUS_FERIDA_LABEL, NIVEL_RISCO_LABEL, NIVEL_EXSUDATO_LABEL,
  ACHADO_PERILESIONAL_LABEL, BORDAS_FERIDA_LABEL, TECIDOS_AFETADOS_LABEL, SINAL_INFECCAO_RESVECH_LABEL,
  TIPO_DOCUMENTO_LABEL, TipoDocumento, NivelRisco, type Documento, type AvaliacaoFerida,
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

// Formatos que o navegador renderiza inline em <img>. HEIC (comum em iPhone) não
// é um deles: o backend só gera thumbnail de JPEG/PNG e o Chrome não decodifica
// HEIC — por isso o card cai no fallback "abrir arquivo" quando é esse o caso.
const MIME_RENDERIZAVEL = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Miniatura de uma foto de ferida. A imagem no R2 é privada; para exibi-la é
 * preciso uma URL de leitura assinada (curta) — sem isso o card só mostrava o
 * nome do arquivo num quadrado cinza (a foto "não aparecia"). Clicar amplia num
 * lightbox para o estomaterapeuta rever o registro fotográfico.
 */
function FotoFeridaCard({ doc }: { doc: Documento }) {
  const [aberto, setAberto] = useState(false);
  const [erroImg, setErroImg] = useState(false);
  const acessoQ = useQuery({
    queryKey: ['documento-access', doc.id],
    queryFn: () => documentosApi.accessUrl(doc.id),
    // A URL assinada expira; staleTime abaixo do TTL evita servir link vencido
    // à miniatura ou ao lightbox.
    staleTime: 4 * 60 * 1000,
  });
  const url = acessoQ.data?.accessUrl;
  const renderizavel = MIME_RENDERIZAVEL.has(doc.mimeType) && !erroImg;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title={`${doc.nome} — ${formatData(doc.criadoEm)}`}
        className="group relative w-24 h-24 rounded border border-border bg-muted overflow-hidden flex items-center justify-center"
      >
        {url && renderizavel ? (
          <img
            src={url}
            alt={doc.nome}
            className="w-full h-full object-cover transition group-hover:scale-105"
            onError={() => setErroImg(true)}
          />
        ) : (
          <span className="px-1 text-center text-[10px] leading-tight text-muted-foreground">
            {acessoQ.isLoading ? 'Carregando…' : doc.nome}
          </span>
        )}
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{doc.nome}</DialogTitle>
            <DialogDescription>
              {formatData(doc.criadoEm)} · {TIPO_DOCUMENTO_LABEL[doc.tipo]}
            </DialogDescription>
          </DialogHeader>
          {!url ? (
            <Skeleton className="h-64 w-full" />
          ) : renderizavel ? (
            <img
              src={url}
              alt={doc.nome}
              className="mx-auto max-h-[70vh] w-auto rounded"
              onError={() => setErroImg(true)}
            />
          ) : (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Prévia não disponível para este formato ({doc.mimeType}).
              </p>
              <Button type="button" onClick={() => window.open(url, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir arquivo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Uma linha "rótulo: valor" do registro escrito; some quando não há valor. */
function Campo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  if (valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0)) {
    return null;
  }
  return (
    <div className="flex gap-2">
      <span className="shrink-0 font-medium text-muted-foreground">{rotulo}:</span>
      <span>{valor}</span>
    </div>
  );
}

/**
 * Card de uma avaliação. O cabeçalho (data, risco, medidas, escalas) fica sempre
 * visível; "Ver registro completo" abre o registro escrito inteiro — perfil
 * tecidual, exsudato, achados, sinais, RESVECH e as recomendações com
 * justificativa — que o estomaterapeuta precisa para rever a consulta. Os dados
 * já vêm da listagem; a expansão só os revela (sem nova requisição).
 */
function CardAvaliacao({ a }: { a: AvaliacaoFerida }) {
  const [aberto, setAberto] = useState(false);
  const risco = a.recomendacoes[0]?.risco ?? NivelRisco.BAIXO;
  const alarmes = [
    a.sinaisSistemicos && 'Sinais sistêmicos',
    a.perfusaoRuim && 'Perfusão ruim',
    a.ossoOuTendaoExposto && 'Osso ou tendão exposto',
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{formatData(a.criadoEm)}</span>
        <Badge variant={RISCO_VARIANT[risco]}>{NIVEL_RISCO_LABEL[risco]}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {a.medicao.comprimentoCm}×{a.medicao.larguraCm}×{a.medicao.profundidadeCm}cm
        {a.medicao.areaCm2 !== undefined && ` (área: ${a.medicao.areaCm2}cm²)`}
      </p>
      {a.escalas && (
        <div className="mt-1 flex gap-2">
          <Badge variant="outline">PUSH {a.escalas.push.total}/17</Badge>
          {a.escalas.resvech && <Badge variant="outline">RESVECH {a.escalas.resvech.total}/35</Badge>}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 h-8 px-2 text-xs"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        {aberto ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
        {aberto ? 'Ocultar registro completo' : 'Ver registro completo'}
      </Button>

      {aberto && (
        <div className="mt-3 space-y-4 border-t pt-3 text-sm">
          <section className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perfil tecidual</h4>
            <Campo rotulo="Granulação" valor={`${a.tecido.granulacaoPct}%`} />
            <Campo rotulo="Epitelização" valor={`${a.tecido.epitelizacaoPct}%`} />
            <Campo rotulo="Esfacelo" valor={`${a.tecido.esfaceloPct}%`} />
            <Campo rotulo="Necrose" valor={`${a.tecido.necrosePct}%`} />
          </section>

          <section className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exsudato e sintomas</h4>
            <Campo rotulo="Exsudato" valor={NIVEL_EXSUDATO_LABEL[a.exsudato]} />
            <Campo rotulo="Dor (0-10)" valor={a.escalaDor} />
            <Campo rotulo="Odor" valor={a.odor ? 'Presente' : 'Ausente'} />
            <Campo
              rotulo="Achados perilesionais"
              valor={a.achadosPerilesionais.map((x) => ACHADO_PERILESIONAL_LABEL[x]).join(', ')}
            />
            <Campo rotulo="Sinais de alarme" valor={alarmes.join(', ')} />
          </section>

          {(a.bordas || a.tecidosAfetados || (a.sinaisInfeccao && a.sinaisInfeccao.length > 0)) && (
            <section className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">RESVECH 2.0</h4>
              <Campo rotulo="Bordas" valor={a.bordas ? BORDAS_FERIDA_LABEL[a.bordas] : undefined} />
              <Campo
                rotulo="Tecido mais profundo"
                valor={a.tecidosAfetados ? TECIDOS_AFETADOS_LABEL[a.tecidosAfetados] : undefined}
              />
              <Campo
                rotulo="Sinais de infecção"
                valor={a.sinaisInfeccao?.map((x) => SINAL_INFECCAO_RESVECH_LABEL[x]).join(', ')}
              />
            </section>
          )}

          {(a.pioraAreaPct30Dias !== undefined || a.diasCicatrizacaoEstagnada !== undefined) && (
            <section className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progressão</h4>
              <Campo
                rotulo="Piora de área (30 dias)"
                valor={a.pioraAreaPct30Dias !== undefined ? `${a.pioraAreaPct30Dias}%` : undefined}
              />
              <Campo
                rotulo="Dias sem cicatrizar"
                valor={a.diasCicatrizacaoEstagnada}
              />
            </section>
          )}

          {a.escalas && (
            <section className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Escalas</h4>
              <Campo
                rotulo="PUSH 3.0"
                valor={`${a.escalas.push.total}/17 (área ${a.escalas.push.area} · exsudato ${a.escalas.push.exsudato} · tecido ${a.escalas.push.tipoTecido})`}
              />
              {a.escalas.resvech && (
                <Campo
                  rotulo="RESVECH 2.0"
                  valor={`${a.escalas.resvech.total}/35 (dimensão ${a.escalas.resvech.dimensao} · profundidade ${a.escalas.resvech.profundidade} · bordas ${a.escalas.resvech.bordas} · leito ${a.escalas.resvech.tecidoLeito} · exsudato ${a.escalas.resvech.exsudato} · infecção ${a.escalas.resvech.infeccaoInflamacao})`}
                />
              )}
              <Campo rotulo="Versão das escalas" valor={a.escalas.versao} />
            </section>
          )}

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recomendações do motor clínico
            </h4>
            {a.recomendacoes.map((r) => (
              <div key={r.regraId} className="rounded border-l-2 border-border pl-3">
                <p className="font-medium">{r.titulo}</p>
                <p className="text-muted-foreground">{r.justificativa}</p>
                <p><span className="font-medium">Ação:</span> {r.acao}</p>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Motor {a.motorClinico} · apoio à decisão, não substitui o julgamento profissional.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

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
    void qc.invalidateQueries({ queryKey: ['documentos', 'ferida', id] });
  }

  if (feridaQ.isLoading || !feridaQ.data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const ferida = feridaQ.data;
  const avaliacoes = [...(avaliacoesQ.data ?? [])].reverse(); // mais recente primeiro na listagem

  return (
    <div className="p-6">
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

      <div className="grid grid-cols-4 gap-4 mb-6">
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
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Escalas (última avaliação)</p>
          <p className="text-lg font-semibold">
            {avaliacoes[0]?.escalas ? (
              <>
                PUSH {avaliacoes[0].escalas.push.total}/17
                {avaliacoes[0].escalas.resvech && (
                  <span className="block text-sm font-medium text-muted-foreground">
                    RESVECH {avaliacoes[0].escalas.resvech.total}/35
                  </span>
                )}
              </>
            ) : '—'}
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
                <FotoFeridaCard key={doc.id} doc={doc} />
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
                <CardAvaliacao key={a.id} a={a} />
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
