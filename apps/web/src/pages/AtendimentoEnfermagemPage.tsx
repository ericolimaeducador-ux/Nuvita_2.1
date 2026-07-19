import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Bandage, CalendarPlus, ClipboardList, Copy, History, Loader2, PenLine, Plus, Stethoscope, User, Video, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { SalaVideo } from '@/components/SalaVideo';
import { NovaFeridaDialog, AvaliacaoFeridaForm } from '@/components/FeridaDialogs';
import { useAuth } from '@/auth/AuthContext';
import { agendaApi, feridasApi, pacientesApi, prontuariosApi, telemedicinaApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { formatData, formatEndereco, linkDaSala, toItems } from '@/utils';
import {
  Agendamento, Ferida, ModalidadeAtendimento, Paciente, Papel, Prontuario, RegistroEnfermagem,
  REGISTRO_ENFERMAGEM_CAMPOS, STATUS_FERIDA_LABEL,
  SalaTelemedicina, StatusAgendamento, StatusSala, STATUS_AGENDAMENTO_LABEL,
  TipoAgendamento, TipoAtendimento,
  TIPO_AGENDAMENTO_LABEL, TIPOS_POR_MODALIDADE,
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

function CampoTexto({
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
function RegistroEnfermagemForm({
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

/** O mesmo formulário, aberto pelo botão "Prontuário" — sem vídeo, para registrar depois. */
function RegistroEnfermagemDialog({
  agendamento, open, onClose,
}: { agendamento: Agendamento | null; open: boolean; onClose: () => void }) {
  const fechar = useRef<() => void>(() => onClose());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && fechar.current()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Registro de consulta de enfermagem</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário de registro da consulta de enfermagem em estomaterapia.
          </DialogDescription>
        </DialogHeader>
        {agendamento && (
          <RegistroEnfermagemForm agendamento={agendamento} open={open} onClose={onClose} fecharRef={fechar} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Painel: feridas do paciente + avaliação embutida
// ---------------------------------------------------------------------------

function PainelFeridas({ pacienteId, clinicaId }: { pacienteId: string; clinicaId?: string }) {
  const qc = useQueryClient();
  const [novaFeridaOpen, setNovaFeridaOpen] = useState(false);
  const [feridaSelecionadaId, setFeridaSelecionadaId] = useState<string | null>(null);

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
        <Button variant="ghost" size="sm" onClick={() => setNovaFeridaOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova ferida
        </Button>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela de atendimento: vídeo do paciente e prontuário lado a lado
// ---------------------------------------------------------------------------

function SessaoAtendimento({
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

// ---------------------------------------------------------------------------
// Dialog: histórico de atendimentos do paciente
// ---------------------------------------------------------------------------

const CAMPO_LABEL = REGISTRO_ENFERMAGEM_CAMPOS;

function HistoricoAtendimentosDialog({
  pacienteId, pacienteNome, open, onClose,
}: { pacienteId: string | null; pacienteNome?: string; open: boolean; onClose: () => void }) {
  const [aberta, setAberta] = useState<string | null>(null);

  const consultasQ = useQuery({
    queryKey: ['consultas-enfermagem', pacienteId],
    queryFn: () => prontuariosApi.list({ pacienteId: pacienteId! }),
    enabled: open && !!pacienteId,
  });
  const consultas = toItems<Prontuario>(consultasQ.data)
    .filter((p) => p.tipo === TipoAtendimento.CONSULTA_ENFERMAGEM);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de atendimentos — {pacienteNome ?? 'paciente'}</DialogTitle>
          <DialogDescription>Consultas de enfermagem deste paciente, da mais recente à mais antiga.</DialogDescription>
        </DialogHeader>
        {consultasQ.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : consultas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum atendimento registrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {consultas.map((c) => (
              <div key={c.id} className="rounded-xl border">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 p-3 text-left"
                  onClick={() => setAberta(aberta === c.id ? null : c.id)}
                >
                  <span className="text-sm font-medium">
                    {dayjs(c.dataAtendimento).format('DD/MM/YYYY HH:mm')}
                  </span>
                  {c.assinado ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">Assinado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30">Rascunho</Badge>
                  )}
                </button>
                {aberta === c.id && (
                  <div className="border-t p-3 space-y-2 text-sm">
                    {CAMPO_LABEL.filter(([k]) => c.registroEnfermagem?.[k] !== undefined && c.registroEnfermagem?.[k] !== '').map(([k, label]) => (
                      <div key={k}>
                        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                        <p className="whitespace-pre-wrap">{String(c.registroEnfermagem?.[k])}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog: novo agendamento de enfermagem
// ---------------------------------------------------------------------------

function NovoAgendamentoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ehEnfermeiro = user?.papel === Papel.ENFERMEIRO;

  const [busca, setBusca] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [tipo, setTipo] = useState<TipoAgendamento>(TipoAgendamento.ATENDIMENTO_ENFERMAGEM);
  const [inicio, setInicio] = useState('');
  const [duracaoMin, setDuracaoMin] = useState('30');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (open) {
      setBusca(''); setPacienteId(''); setObservacoes('');
      setTipo(TipoAgendamento.ATENDIMENTO_ENFERMAGEM);
      setInicio(dayjs().add(1, 'hour').startOf('hour').format('YYYY-MM-DDTHH:mm'));
      setDuracaoMin('30');
      setProfissionalId(ehEnfermeiro ? (user?.id ?? '') : '');
    }
  }, [open, ehEnfermeiro, user?.id]);

  const pacientesQ = useQuery({
    queryKey: ['pacientes-busca-enfermagem', busca],
    queryFn: () => pacientesApi.list({ nome: busca || undefined, limit: 10 }),
    enabled: open,
  });
  const pacientes = toItems<Paciente>(pacientesQ.data);

  const criarM = useMutation({
    mutationFn: () =>
      agendaApi.create({
        clinicaId: user?.clinicaId ?? '',
        pacienteId,
        medicoId: profissionalId,
        modalidade: ModalidadeAtendimento.ENFERMAGEM,
        tipo,
        dataHoraInicio: dayjs(inicio).toISOString(),
        dataHoraFim: dayjs(inicio).add(Number(duracaoMin) || 30, 'minute').toISOString(),
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Agendamento criado.' });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-enfermagem'] });
      onClose();
    },
    onError: (e) => toast({ title: 'Erro ao agendar', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const submeter = () => {
    if (!pacienteId) { toast({ title: 'Selecione o paciente.', variant: 'destructive' }); return; }
    if (!profissionalId) { toast({ title: 'Informe o profissional responsável.', variant: 'destructive' }); return; }
    if (!inicio) { toast({ title: 'Informe a data e hora.', variant: 'destructive' }); return; }
    criarM.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !criarM.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo agendamento de enfermagem</DialogTitle>
          <DialogDescription>Agende uma consulta ou procedimento de enfermagem em estomaterapia.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Input placeholder="Buscar por nome…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <Select value={pacienteId} onValueChange={setPacienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
              <SelectContent>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}{p.cpf ? ` — ${p.cpf}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!ehEnfermeiro && (
            <div className="space-y-2">
              <Label>ID do enfermeiro responsável</Label>
              <Input value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} placeholder="ID do usuário enfermeiro" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAgendamento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_POR_MODALIDADE[ModalidadeAtendimento.ENFERMAGEM].map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_AGENDAMENTO_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" min={10} step={5} value={duracaoMin} onChange={(e) => setDuracaoMin(e.target.value)} />
            </div>
          </div>
          <CampoTexto label="Observações" value={observacoes} onChange={setObservacoes} minRows={2} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={criarM.isPending}>Cancelar</Button>
          <Button onClick={submeter} disabled={criarM.isPending}>
            {criarM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const STATUS_BADGE: Partial<Record<StatusAgendamento, string>> = {
  [StatusAgendamento.AGENDADO]: 'text-blue-600 border-blue-500/30',
  [StatusAgendamento.CONFIRMADO]: 'text-cyan-600 border-cyan-500/30',
  [StatusAgendamento.CONCLUIDO]: 'text-emerald-600 border-emerald-500/30',
  [StatusAgendamento.CANCELADO]: 'text-red-600 border-red-500/30',
  [StatusAgendamento.FALTA]: 'text-orange-600 border-orange-500/30',
};

export function AtendimentoEnfermagemPage() {
  const { user } = useAuth();
  const ehEnfermeiro = user?.papel === Papel.ENFERMEIRO;

  const [status, setStatus] = useState<'ativos' | StatusAgendamento>('ativos');
  const [novoAberto, setNovoAberto] = useState(false);
  const [registroDe, setRegistroDe] = useState<Agendamento | null>(null);
  const [historicoDe, setHistoricoDe] = useState<Agendamento | null>(null);
  const [salaCarregandoId, setSalaCarregandoId] = useState<string | null>(null);
  const [sessao, setSessao] = useState<{ agendamento: Agendamento; sala: SalaTelemedicina } | null>(null);

  // Atendimento é 100% online por ora: "Atender" cria (ou reaproveita) a sala do
  // agendamento e abre a tela de sessão — vídeo e prontuário na mesma janela,
  // para o enfermeiro tomar notas sem perder o paciente de vista.
  const atenderMut = useMutation({
    mutationFn: async (a: Agendamento) => {
      let sala: SalaTelemedicina | null = null;
      try {
        sala = await telemedicinaApi.findByAgendamento(a.id);
      } catch (e) {
        if (!axios.isAxiosError(e) || e.response?.status !== 404) throw e;
      }
      // Sala encerrada/expirada não aceita mais ninguém: abre uma nova.
      if (!sala || sala.status === StatusSala.ENCERRADA || sala.status === StatusSala.EXPIRADA) {
        sala = await telemedicinaApi.createSala({
          clinicaId: user?.clinicaId ?? '',
          agendamentoId: a.id,
          pacienteId: a.pacienteId,
          modalidade: ModalidadeAtendimento.ENFERMAGEM,
        });
      }
      return { agendamento: a, sala };
    },
    onSuccess: ({ agendamento, sala }) => {
      setSalaCarregandoId(null);
      setSessao({ agendamento, sala });
    },
    onError: (e) => {
      setSalaCarregandoId(null);
      toast({ title: 'Erro ao abrir a sala de telemedicina', description: apiErrorMessage(e), variant: 'destructive' });
    },
  });

  function atender(a: Agendamento) {
    setSalaCarregandoId(a.id);
    atenderMut.mutate(a);
  }

  const agendamentosQ = useQuery({
    queryKey: ['agendamentos-enfermagem', ehEnfermeiro ? user?.id : 'todos'],
    queryFn: () =>
      agendaApi.list({
        modalidade: ModalidadeAtendimento.ENFERMAGEM,
        // Enfermeiro vê a própria agenda; admin/secretária veem todos da clínica.
        medicoId: ehEnfermeiro ? user?.id : undefined,
      }),
  });

  const agendamentos = useMemo(() => {
    const itens = toItems<Agendamento>(agendamentosQ.data);
    const filtrados = status === 'ativos'
      ? itens.filter((a) => a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO)
      : itens.filter((a) => a.status === status);
    return [...filtrados].sort((a, b) => dayjs(a.dataHoraInicio).valueOf() - dayjs(b.dataHoraInicio).valueOf());
  }, [agendamentosQ.data, status]);

  if (sessao) {
    return (
      <SessaoAtendimento
        agendamento={sessao.agendamento}
        sala={sessao.sala}
        onSair={() => setSessao(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Stethoscope className="h-6 w-6" /> Atendimento de Enfermagem
          </h1>
          <p className="text-sm text-muted-foreground">
            Pacientes agendados para consulta e procedimento de enfermagem em estomaterapia.
          </p>
        </div>
        <Button onClick={() => setNovoAberto(true)}>
          <CalendarPlus className="h-4 w-4 mr-2" /> Novo agendamento
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground">Mostrar:</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Agendados e confirmados</SelectItem>
            {Object.values(StatusAgendamento).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_AGENDAMENTO_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {agendamentosQ.isLoading ? (
        <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : agendamentos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum paciente agendado para o enfermeiro neste filtro.
        </div>
      ) : (
        <div className="space-y-2">
          {agendamentos.map((a) => (
            <div key={a.id} className="rounded-xl border p-4 flex flex-wrap items-center gap-4">
              <div className="min-w-40">
                <p className="font-medium">{dayjs(a.dataHoraInicio).format('DD/MM/YYYY')}</p>
                <p className="text-sm text-muted-foreground">
                  {dayjs(a.dataHoraInicio).format('HH:mm')} – {dayjs(a.dataHoraFim).format('HH:mm')}
                </p>
              </div>
              <div className="flex-1 min-w-48">
                <Link to={`/pacientes/${a.pacienteId}`} className="font-medium hover:underline">
                  {a.pacienteNome ?? a.pacienteId}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {a.pacienteCpf ? `CPF ${a.pacienteCpf} · ` : ''}{TIPO_AGENDAMENTO_LABEL[a.tipo]}
                </p>
              </div>
              <Badge variant="outline" className={STATUS_BADGE[a.status]}>
                {STATUS_AGENDAMENTO_LABEL[a.status]}
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setHistoricoDe(a)}>
                  <History className="h-4 w-4 mr-2" /> Histórico
                </Button>
                {(a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO) && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setRegistroDe(a)}>
                      <ClipboardList className="h-4 w-4 mr-2" /> Prontuário
                    </Button>
                    <Button size="sm" disabled={salaCarregandoId === a.id} onClick={() => atender(a)}>
                      {salaCarregandoId === a.id
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Video className="h-4 w-4 mr-2" />}
                      Atender
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <NovoAgendamentoDialog open={novoAberto} onClose={() => setNovoAberto(false)} />
      <RegistroEnfermagemDialog agendamento={registroDe} open={!!registroDe} onClose={() => setRegistroDe(null)} />
      <HistoricoAtendimentosDialog
        pacienteId={historicoDe?.pacienteId ?? null}
        pacienteNome={historicoDe?.pacienteNome}
        open={!!historicoDe}
        onClose={() => setHistoricoDe(null)}
      />
    </div>
  );
}
