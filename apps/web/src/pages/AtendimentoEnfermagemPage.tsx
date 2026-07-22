import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { CalendarPlus, ClipboardList, History, Loader2, Stethoscope, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { CampoTexto, RegistroEnfermagemForm, SessaoAtendimento } from '@/components/SessaoAtendimentoEnfermagem';
import { useAuth } from '@/auth/AuthContext';
import { agendaApi, pacientesApi, prontuariosApi, telemedicinaApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import {
  Agendamento, ModalidadeAtendimento, Paciente, Papel, Prontuario,
  REGISTRO_ENFERMAGEM_CAMPOS,
  SalaTelemedicina, StatusAgendamento, StatusSala, STATUS_AGENDAMENTO_LABEL,
  TipoAgendamento, TipoAtendimento,
  TIPO_AGENDAMENTO_LABEL, TIPOS_POR_MODALIDADE,
} from '@/types';

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
  const location = useLocation();
  const navigate = useNavigate();

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

  // "Atender" clicado a partir do Dashboard: chega aqui via router state, abre
  // a sala direto (mesmo padrão do "iniciar atendimento" na ficha do paciente)
  // e limpa o state pra não reabrir num refresh/voltar.
  useEffect(() => {
    const autoAtenderId = (location.state as { autoAtenderAgendamentoId?: string } | null)?.autoAtenderAgendamentoId;
    if (!autoAtenderId) return;
    const alvo = toItems<Agendamento>(agendamentosQ.data).find((a) => a.id === autoAtenderId);
    if (!alvo) return;
    atender(alvo);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, agendamentosQ.data]);

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
