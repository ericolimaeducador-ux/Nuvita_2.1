import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Bandage, Copy, Loader2, PenLine, Plus, Stethoscope, User, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { SalaVideo } from '@/components/SalaVideo';
import { NovaFeridaDialog, AvaliacaoFeridaForm } from '@/components/FeridaDialogs';
import { ReceituarioEnfermagemDialog } from '@/components/ReceituarioEnfermagemDialog';
import { useAuth } from '@/auth/AuthContext';
import { feridasApi, pacientesApi, prontuariosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { formatData, formatEndereco, linkDaSala, toItems } from '@/utils';
import {
  Agendamento, Ferida, Paciente, RegistroEnfermagem, STATUS_FERIDA_LABEL,
  SalaTelemedicina, TipoAtendimento, TIPO_AGENDAMENTO_LABEL,
} from '@/types';

/** Textarea que cresce conforme o texto — o enfermeiro enxerga a anotação
 * inteira enquanto escreve, sem rolagem interna num campo pequeno. */
function AutoTextarea({
  value, onChange, placeholder, minRows = 3,
}: { value?: string; onChange: (v: string) => void; placeholder?: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none overflow-hidden"
    />
  );
}

export function CampoTexto({
  label, value, onChange, placeholder, minRows,
}: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; minRows?: number }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <AutoTextarea value={value} onChange={onChange} placeholder={placeholder} minRows={minRows} />
    </div>
  );
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">{children}</p>
      <Separator />
    </>
  );
}

/** Remove strings vazias/undefined antes de montar o payload. */
function limpar<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    saida[k] = v;
  }
  return saida as Partial<T>;
}

// ---------------------------------------------------------------------------
// Formulário: registro da consulta de enfermagem (SOAP de estomaterapia)
// ---------------------------------------------------------------------------

/**
 * Formulário de registro da consulta. Vive em dois lugares: no diálogo do
 * botão "Prontuário" e ao lado do vídeo, na tela de atendimento — por isso
 * não traz moldura própria.
 */
export function RegistroEnfermagemForm({
  agendamento, open, onClose, fecharRef,
}: {
  agendamento: Agendamento;
  /** Falso enquanto o diálogo está fechado — zera o formulário entre pacientes. */
  open: boolean;
  onClose: () => void;
  /** Recebe o fechar "guardado" (confirma se há anotação não salva) para o X e o ESC do diálogo. */
  fecharRef?: MutableRefObject<() => void>;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reg, setReg] = useState<RegistroEnfermagem>({});
  const set = (patch: Partial<RegistroEnfermagem>) => setReg((r) => ({ ...r, ...patch }));

  useEffect(() => {
    if (!open) return;
    setReg({ coren: user?.registroProfissional });
  }, [open, user?.registroProfissional]);

  const pacienteQ = useQuery({
    queryKey: ['paciente', agendamento?.pacienteId],
    queryFn: () => pacientesApi.get(agendamento!.pacienteId),
    enabled: open && !!agendamento?.pacienteId,
  });
  const paciente: Paciente | undefined = pacienteQ.data;

  const salvarM = useMutation({
    mutationFn: async (assinar: boolean) => {
      const prontuario = await prontuariosApi.create({
        clinicaId: user?.clinicaId,
        pacienteId: agendamento!.pacienteId,
        agendamentoId: agendamento!.id,
        dataAtendimento: new Date().toISOString(),
        tipo: TipoAtendimento.CONSULTA_ENFERMAGEM,
        registroEnfermagem: limpar(reg as Record<string, unknown>),
      });
      if (assinar) await prontuariosApi.assinar(prontuario.id);
      return prontuario;
    },
    onSuccess: (_p, assinar) => {
      toast({ title: assinar ? 'Atendimento registrado e assinado.' : 'Atendimento registrado como rascunho.' });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-enfermagem'] });
      queryClient.invalidateQueries({ queryKey: ['consultas-enfermagem'] });
      onClose();
    },
    onError: (e) => toast({ title: 'Erro ao registrar atendimento', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const salvar = (assinar: boolean) => {
    if (!reg.motivoAtendimento && !reg.evolucao) {
      toast({ title: 'Preencha ao menos o motivo do atendimento ou a evolução.', variant: 'destructive' });
      return;
    }
    salvarM.mutate(assinar);
  };

  /** Um formulário aberto durante a consulta não pode fechar por um clique fora ou um ESC distraído. */
  const temConteudo = Object.entries(reg).some(([k, v]) => k !== 'coren' && v !== undefined && v !== '');
  function fechar() {
    if (salvarM.isPending) return;
    if (temConteudo && !window.confirm('As anotações deste atendimento ainda não foram salvas. Fechar mesmo assim?')) return;
    onClose();
  }

  useEffect(() => {
    if (fecharRef) fecharRef.current = fechar;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Registro de consulta de enfermagem em estomaterapia. Após assinado, fica imutável (correções só por adendo).
      </p>

      {/* Dados do paciente */}
      <div className="rounded-xl border p-4 space-y-1 text-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <User className="h-3.5 w-3.5" /> Paciente
        </p>
        {pacienteQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <p className="font-medium text-base">{paciente?.nome ?? agendamento?.pacienteNome ?? '—'}</p>
            <p className="text-muted-foreground">
              CPF: {paciente?.cpf ?? agendamento?.pacienteCpf ?? '—'} · Nascimento: {formatData(paciente?.dataNascimento)} · Sexo: {paciente?.sexo ?? '—'}
            </p>
            <p className="text-muted-foreground">
              Telefone: {paciente?.telefone ?? '—'}{paciente?.endereco ? ` · ${formatEndereco(paciente.endereco)}` : ''}
            </p>
          </>
        )}
      </div>

      <SecaoTitulo>Consulta</SecaoTitulo>
      <CampoTexto label="Motivo do atendimento" value={reg.motivoAtendimento} onChange={(v) => set({ motivoAtendimento: v })} minRows={2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto label="Comorbidades relevantes" value={reg.comorbidadesRelevantes} onChange={(v) => set({ comorbidadesRelevantes: v })} placeholder="Diabetes, doença vascular periférica, insuficiência renal…" minRows={2} />
        <CampoTexto label="Mobilidade" value={reg.mobilidade} onChange={(v) => set({ mobilidade: v })} placeholder="Acamado, cadeira de rodas, deambula com/sem auxílio" minRows={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Escore de Braden (6-23)</Label>
          <Input
            type="number" min={6} max={23} value={reg.escoreBraden ?? ''}
            onChange={(e) => set({ escoreBraden: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Dor geral (0-10)</Label>
          <Input
            type="number" min={0} max={10} value={reg.dorGeral ?? ''}
            onChange={(e) => set({ dorGeral: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </div>
        <CampoTexto label="Estado nutricional" value={reg.estadoNutricional} onChange={(v) => set({ estadoNutricional: v })} minRows={1} />
      </div>
      <CampoTexto label="Curativo atual (cobertura em uso, frequência de troca)" value={reg.curativoAtual} onChange={(v) => set({ curativoAtual: v })} minRows={2} />
      <CampoTexto label="Adesão ao tratamento / suporte familiar / acesso a curativos" value={reg.adesaoTratamento} onChange={(v) => set({ adesaoTratamento: v })} minRows={2} />
      <CampoTexto label="Orientações fornecidas" value={reg.orientacoesFornecidas} onChange={(v) => set({ orientacoesFornecidas: v })} minRows={2} />
      <CampoTexto label="Evolução" value={reg.evolucao} onChange={(v) => set({ evolucao: v })} minRows={3} />
      <CampoTexto label="Plano / próximos passos" value={reg.planoProximosPassos} onChange={(v) => set({ planoProximosPassos: v })} minRows={2} />

      <div className="space-y-2 max-w-xs">
        <Label>COREN do enfermeiro responsável</Label>
        <Input value={reg.coren ?? ''} onChange={(e) => set({ coren: e.target.value })} placeholder="COREN 000000-SP" />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={fechar} disabled={salvarM.isPending}>Fechar</Button>
        <Button variant="secondary" onClick={() => salvar(false)} disabled={salvarM.isPending}>
          {salvarM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar rascunho
        </Button>
        <Button onClick={() => salvar(true)} disabled={salvarM.isPending}>
          {salvarM.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenLine className="h-4 w-4 mr-2" />}
          Salvar e assinar
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel: feridas do paciente + avaliação embutida
// ---------------------------------------------------------------------------

function PainelFeridas({ pacienteId, clinicaId }: { pacienteId: string; clinicaId?: string }) {
  const qc = useQueryClient();
  const [novaFeridaOpen, setNovaFeridaOpen] = useState(false);
  const [feridaSelecionadaId, setFeridaSelecionadaId] = useState<string | null>(null);
  const [receituarioOpen, setReceituarioOpen] = useState(false);

  const feridasQ = useQuery({
    queryKey: ['feridas-paciente', pacienteId],
    queryFn: () => feridasApi.listByPaciente(pacienteId),
  });
  const feridas = toItems<Ferida>(feridasQ.data as never);

  function refetch() {
    void qc.invalidateQueries({ queryKey: ['feridas-paciente', pacienteId] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Bandage className="h-3.5 w-3.5" /> Feridas do paciente
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setReceituarioOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Receituário
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setNovaFeridaOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova ferida
          </Button>
        </div>
      </div>

      {feridasQ.isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : feridas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma ferida registrada ainda para este paciente.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {feridas.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFeridaSelecionadaId(feridaSelecionadaId === f.id ? null : f.id)}
              className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
                feridaSelecionadaId === f.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
              }`}
            >
              <span className="font-medium">{f.rotulo}</span>
              <span className="ml-2 text-xs text-muted-foreground">{f.localizacao}</span>
              <Badge variant="outline" className="ml-2 text-xs">{STATUS_FERIDA_LABEL[f.status]}</Badge>
            </button>
          ))}
        </div>
      )}

      {feridaSelecionadaId && (
        <div className="rounded-xl border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Nova avaliação — {feridas.find((f) => f.id === feridaSelecionadaId)?.rotulo}
          </p>
          <AvaliacaoFeridaForm
            feridaId={feridaSelecionadaId}
            onCancel={() => setFeridaSelecionadaId(null)}
            onCreated={() => setFeridaSelecionadaId(null)}
          />
        </div>
      )}

      <NovaFeridaDialog
        open={novaFeridaOpen}
        onOpenChange={setNovaFeridaOpen}
        pacienteId={pacienteId}
        clinicaId={clinicaId}
        onCreated={refetch}
      />
      <ReceituarioEnfermagemDialog
        pacienteId={pacienteId}
        feridaId={feridaSelecionadaId ?? undefined}
        open={receituarioOpen}
        onOpenChange={setReceituarioOpen}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela de atendimento: vídeo do paciente e prontuário lado a lado
// ---------------------------------------------------------------------------

/**
 * Tela cheia de atendimento por telemedicina: vídeo de um lado, SOAP de
 * enfermagem + feridas do outro. Usada tanto pelo fluxo "Atender" da agenda
 * (`AtendimentoEnfermagemPage`) quanto ao entrar numa sala criada direto na
 * tela de Telemedicina (`TelemedicinaPage`) — o profissional nunca deve cair
 * na tela de vídeo puro, que é só para o paciente (link público `/tele/:token`).
 */
export function SessaoAtendimento({
  agendamento, sala, onSair,
}: { agendamento: Agendamento; sala: SalaTelemedicina; onSair: () => void }) {
  const { user } = useAuth();
  const fechar = useRef<() => void>(() => onSair());

  function copiarLinkPaciente() {
    void navigator.clipboard.writeText(linkDaSala(sala.tokenPaciente));
    toast({ title: 'Link do paciente copiado.', description: 'Envie por WhatsApp ou e-mail — o paciente entra sem login.' });
  }

  // Ocupa a janela inteira: durante a consulta a tela é do atendimento, e o
  // enfermeiro escreve no prontuário sem tirar o paciente da vista.
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="flex-1 min-w-48">
          <p className="font-medium flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> {agendamento.pacienteNome ?? 'Consulta de enfermagem'}
          </p>
          <p className="text-xs text-muted-foreground">
            {TIPO_AGENDAMENTO_LABEL[agendamento.tipo]} · {dayjs(agendamento.dataHoraInicio).format('DD/MM/YYYY HH:mm')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copiarLinkPaciente}>
          <Copy className="h-4 w-4 mr-2" /> Copiar link do paciente
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fechar.current()}>
          <X className="h-4 w-4 mr-2" /> Sair do atendimento
        </Button>
      </div>

      <div className="flex-1 grid gap-4 overflow-hidden p-4 lg:grid-cols-2">
        <div className="min-h-64 overflow-hidden rounded-xl border">
          <SalaVideo token={sala.tokenMedico} embutido />
        </div>
        <div className="overflow-y-auto rounded-xl border p-4 space-y-6">
          <RegistroEnfermagemForm agendamento={agendamento} open onClose={onSair} fecharRef={fechar} />
          <Separator />
          <PainelFeridas pacienteId={agendamento.pacienteId} clinicaId={user?.clinicaId} />
        </div>
      </div>
    </div>
  );
}
