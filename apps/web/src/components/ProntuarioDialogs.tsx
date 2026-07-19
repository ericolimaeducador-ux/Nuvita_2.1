import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PenLine, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { prontuariosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/auth/AuthContext';
import {
  TipoAtendimento, TIPO_ATENDIMENTO_LABEL,
  type Prontuario,
  type ProntuarioSubjetivo, type ProntuarioObjetivo, type ExameSegmentar, type SinaisVitais,
  type ProntuarioAvaliacao, type ProntuarioPlano, type RegistroEnfermagem,
} from '@/types';

const EXAME_SEGMENTAR_CAMPOS: { key: keyof ExameSegmentar; label: string }[] = [
  { key: 'cabecaPescoco', label: 'Cabeça e pescoço' },
  { key: 'cardiovascular', label: 'Cardiovascular' },
  { key: 'respiratorio', label: 'Respiratório' },
  { key: 'abdome', label: 'Abdome' },
  { key: 'geniturinario', label: 'Geniturinário' },
  { key: 'neurologico', label: 'Neurológico' },
  { key: 'extremidades', label: 'Extremidades' },
  { key: 'pele', label: 'Pele e mucosas' },
];

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5 whitespace-pre-line">{children || '—'}</p>
    </div>
  );
}

/** Só renderiza o Campo se houver valor — evita poluir a visualização. */
function CampoSe({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === undefined || children === null || children === '' ||
      (Array.isArray(children) && children.length === 0)) return null;
  return <Campo label={label}>{children}</Campo>;
}

function SecaoSOAP({ letra, titulo, children }: { letra: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">{letra} — {titulo}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/** Visualização (somente leitura) de um prontuário SOAP, com ação de assinar rascunho. */
export function ProntuarioDetailDialog({
  prontuarioId,
  pacienteId,
  open,
  onOpenChange,
}: {
  prontuarioId: string | null;
  pacienteId?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['prontuario', prontuarioId],
    queryFn: () => prontuariosApi.get(prontuarioId!),
    enabled: !!prontuarioId && open,
  });
  const assinarMut = useMutation({
    mutationFn: () => prontuariosApi.assinar(prontuarioId!),
    onSuccess: () => {
      toast.success('Prontuário assinado.');
      void qc.invalidateQueries({ queryKey: ['prontuario', prontuarioId] });
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const pr = q.data as Prontuario | undefined;

  const sv = pr?.objetivo?.sinaisVitais;
  const sinais = sv
    ? [
        sv.pressaoArterial && `PA ${sv.pressaoArterial}`,
        sv.frequenciaCardiaca && `FC ${sv.frequenciaCardiaca} bpm`,
        sv.frequenciaRespiratoria && `FR ${sv.frequenciaRespiratoria} irpm`,
        sv.temperatura && `Tax ${sv.temperatura} °C`,
        sv.saturacaoO2 && `SatO₂ ${sv.saturacaoO2}%`,
        sv.peso && `Peso ${sv.peso} kg`,
        sv.altura && `Altura ${sv.altura} cm`,
        sv.escalaDor !== undefined && `Dor ${sv.escalaDor}/10`,
      ].filter(Boolean).join('  ·  ')
    : '';
  const seg = pr?.objetivo?.exameSegmentar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Prontuário
            {pr && <Badge variant={pr.assinado ? 'success' : 'warning'}>{pr.assinado ? 'Assinado' : 'Rascunho'}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : !pr ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Não foi possível carregar o prontuário.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 glass rounded-xl p-4">
              <Campo label="Data do atendimento">{pr.dataAtendimento ? dayjs(pr.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'}</Campo>
              <Campo label="Tipo">{TIPO_ATENDIMENTO_LABEL[pr.tipo] ?? pr.tipo}</Campo>
              {pr.assinado?.dataAssinatura && (
                <Campo label="Assinado em">{dayjs(pr.assinado.dataAssinatura).format('DD/MM/YYYY HH:mm')}</Campo>
              )}
            </div>

            {pr.tipo !== TipoAtendimento.CONSULTA_ENFERMAGEM && (
            <>
            <SecaoSOAP letra="S" titulo="Subjetivo / Anamnese">
              <Campo label="Queixa principal">{pr.subjetivo?.queixaPrincipal}</Campo>
              <CampoSe label="História da doença atual">{pr.subjetivo?.hda}</CampoSe>
              <CampoSe label="Antecedentes pessoais">{pr.subjetivo?.antecedentesPessoais}</CampoSe>
              <CampoSe label="Antecedentes cirúrgicos">{pr.subjetivo?.antecedentesCirurgicos}</CampoSe>
              <CampoSe label="Medicamentos em uso">{pr.subjetivo?.medicamentosEmUso}</CampoSe>
              <CampoSe label="Alergias">{pr.subjetivo?.alergias}</CampoSe>
              <CampoSe label="História familiar">{pr.subjetivo?.historiaFamiliar}</CampoSe>
              <CampoSe label="História social">{pr.subjetivo?.historiaSocial}</CampoSe>
              <CampoSe label="Revisão de sistemas">{pr.subjetivo?.revisaoSistemas}</CampoSe>
            </SecaoSOAP>

            <SecaoSOAP letra="O" titulo="Objetivo / Exame físico">
              <CampoSe label="Estado geral">{pr.objetivo?.estadoGeral}</CampoSe>
              <CampoSe label="Sinais vitais">{sinais}</CampoSe>
              {seg && Object.values(seg).some(Boolean) && (
                <div className="grid grid-cols-2 gap-3">
                  {EXAME_SEGMENTAR_CAMPOS.map(({ key, label }) => (
                    <CampoSe key={key} label={label}>{seg[key]}</CampoSe>
                  ))}
                </div>
              )}
              <CampoSe label="Outros achados">{pr.objetivo?.exameFisico}</CampoSe>
            </SecaoSOAP>

            <SecaoSOAP letra="A" titulo="Avaliação">
              <CampoSe label="Hipóteses diagnósticas">{pr.avaliacao?.hipotesesDiagnosticas?.join(', ')}</CampoSe>
              <CampoSe label="CID-10">{pr.avaliacao?.cid10?.join(', ')}</CampoSe>
              <CampoSe label="Diagnóstico definitivo">{pr.avaliacao?.diagnosticoDefinitivo}</CampoSe>
              <CampoSe label="Evolução">{pr.avaliacao?.evolucao}</CampoSe>
            </SecaoSOAP>

            <SecaoSOAP letra="P" titulo="Plano">
              <CampoSe label="Conduta">{pr.plano?.conduta}</CampoSe>
              <CampoSe label="Prescrição">{pr.plano?.prescricao}</CampoSe>
              <CampoSe label="Exames solicitados">{pr.plano?.examesSolicitados?.join(', ')}</CampoSe>
              <CampoSe label="Orientações">{pr.plano?.orientacoes}</CampoSe>
              <CampoSe label="Encaminhamentos">{pr.plano?.encaminhamentos}</CampoSe>
              <CampoSe label="Retorno">{pr.plano?.retorno}</CampoSe>
            </SecaoSOAP>
            </>
            )}

            {pr.registroEnfermagem && (
              <div className="glass rounded-xl p-4 border border-primary/20 space-y-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Registro de Enfermagem — Estomaterapia
                </p>
                <CampoSe label="Motivo do atendimento">{pr.registroEnfermagem.motivoAtendimento}</CampoSe>
                <div className="grid grid-cols-2 gap-3">
                  <CampoSe label="Comorbidades relevantes">{pr.registroEnfermagem.comorbidadesRelevantes}</CampoSe>
                  <CampoSe label="Mobilidade">{pr.registroEnfermagem.mobilidade}</CampoSe>
                  <CampoSe label="Escore de Braden">{pr.registroEnfermagem.escoreBraden}</CampoSe>
                  <CampoSe label="Estado nutricional">{pr.registroEnfermagem.estadoNutricional}</CampoSe>
                  <CampoSe label="Dor geral (0-10)">{pr.registroEnfermagem.dorGeral}</CampoSe>
                  <CampoSe label="Curativo atual">{pr.registroEnfermagem.curativoAtual}</CampoSe>
                </div>
                <CampoSe label="Adesão ao tratamento / suporte">{pr.registroEnfermagem.adesaoTratamento}</CampoSe>
                <CampoSe label="Orientações fornecidas">{pr.registroEnfermagem.orientacoesFornecidas}</CampoSe>
                <CampoSe label="Evolução">{pr.registroEnfermagem.evolucao}</CampoSe>
                <CampoSe label="Plano / próximos passos">{pr.registroEnfermagem.planoProximosPassos}</CampoSe>
                <CampoSe label="COREN">{pr.registroEnfermagem.coren}</CampoSe>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {pr && pacienteId && (
            <Button variant="outline" onClick={() => navigate(`/pacientes/${pacienteId}/prontuario/${pr.id}/imprimir`)}>
              <FileText className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          )}
          {pr && !pr.assinado && (
            <Button variant="outline" disabled={assinarMut.isPending} onClick={() => assinarMut.mutate()}>
              <PenLine className="mr-2 h-4 w-4" /> {assinarMut.isPending ? 'Assinando...' : 'Assinar prontuário'}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Formulário de novo atendimento ---------------------------------------

function TextField({ label, value, onChange, rows = 2, placeholder }: {
  label: string; value?: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Abre um novo atendimento (ficha SOAP em branco) já vinculado a um paciente.
 * Quando aberto a partir de um agendamento ("Iniciar atendimento"), `agendamentoId`
 * é enviado junto e o backend conclui o agendamento automaticamente ao salvar. */
export function NovoAtendimentoDialog({
  pacienteId,
  pacienteNome,
  open,
  onOpenChange,
  agendamentoId,
  initialTipo,
  initialData,
}: {
  pacienteId: string;
  pacienteNome?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agendamentoId?: string;
  initialTipo?: TipoAtendimento;
  initialData?: string;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [data, setData] = useState(initialData ?? dayjs().format('YYYY-MM-DDTHH:mm'));
  const [tipo, setTipo] = useState<TipoAtendimento>(initialTipo ?? TipoAtendimento.CONSULTA);
  const isEnfermagem = tipo === TipoAtendimento.CONSULTA_ENFERMAGEM;

  useEffect(() => {
    if (open) {
      setData(initialData ?? dayjs().format('YYYY-MM-DDTHH:mm'));
      setTipo(initialTipo ?? TipoAtendimento.CONSULTA);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTipo, initialData]);

  // Consulta de enfermagem em estomaterapia.
  const [enf, setEnf] = useState<RegistroEnfermagem>({});
  const setE = (patch: Partial<RegistroEnfermagem>) => setEnf((r) => ({ ...r, ...patch }));

  const [subjetivo, setSubjetivo] = useState<ProntuarioSubjetivo>({});
  const [sinais, setSinais] = useState<SinaisVitais>({});
  const [estadoGeral, setEstadoGeral] = useState('');
  const [seg, setSeg] = useState<ExameSegmentar>({});
  const [exameOutros, setExameOutros] = useState('');
  const [avaliacao, setAvaliacao] = useState<ProntuarioAvaliacao>({});
  const [plano, setPlano] = useState<ProntuarioPlano>({});

  const [cidSearch, setCidSearch] = useState('');
  const [cidSelected, setCidSelected] = useState<string[]>([]);
  const [cidOpts, setCidOpts] = useState<{ value: string; label: string }[]>([]);

  const setS = (patch: Partial<ProntuarioSubjetivo>) => setSubjetivo((s) => ({ ...s, ...patch }));
  const setSV = (patch: Partial<SinaisVitais>) => setSinais((s) => ({ ...s, ...patch }));
  const setSeg2 = (patch: Partial<ExameSegmentar>) => setSeg((s) => ({ ...s, ...patch }));
  const setA = (patch: Partial<ProntuarioAvaliacao>) => setAvaliacao((a) => ({ ...a, ...patch }));
  const setP = (patch: Partial<ProntuarioPlano>) => setPlano((p) => ({ ...p, ...patch }));
  const num = (v: string): number | undefined => (v ? Number(v) : undefined);

  function reset() {
    setData(dayjs().format('YYYY-MM-DDTHH:mm')); setTipo(TipoAtendimento.CONSULTA);
    setSubjetivo({}); setSinais({}); setEstadoGeral(''); setSeg({}); setExameOutros('');
    setAvaliacao({}); setPlano({});
    setCidSearch(''); setCidSelected([]); setCidOpts([]);
    setEnf({});
  }

  async function buscarCid(qstr: string) {
    setCidSearch(qstr);
    if (!qstr || qstr.length < 2) return setCidOpts([]);
    try {
      const r = await prontuariosApi.cid10(qstr);
      setCidOpts((r ?? []).map((c) => ({ value: c.codigo, label: `${c.codigo} — ${c.descricao}` })));
    } catch { setCidOpts([]); }
  }

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => prontuariosApi.create(payload),
    onSuccess: () => {
      toast.success('Atendimento registrado.');
      reset();
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
      void qc.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function clean<T extends object>(obj: T): T | undefined {
    const entries = Object.entries(obj).filter(([, v]) =>
      v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0));
    return entries.length ? (Object.fromEntries(entries) as T) : undefined;
  }

  function submit() {
    if (isEnfermagem) {
      const registroEnfermagem = clean(enf);
      if (!registroEnfermagem) {
        toast.error('Preencha ao menos um campo do registro de enfermagem.');
        return;
      }
      createMut.mutate({
        clinicaId: user?.clinicaId,
        pacienteId,
        agendamentoId,
        dataAtendimento: dayjs(data).toISOString(),
        tipo,
        registroEnfermagem,
      });
      return;
    }

    if (!subjetivo.queixaPrincipal) { toast.error('Informe ao menos a queixa principal.'); return; }
    const objetivo: ProntuarioObjetivo = {
      estadoGeral: estadoGeral || undefined,
      sinaisVitais: clean(sinais),
      exameSegmentar: clean(seg),
      exameFisico: exameOutros || undefined,
    };
    createMut.mutate({
      clinicaId: user?.clinicaId,
      pacienteId,
      agendamentoId,
      dataAtendimento: dayjs(data).toISOString(),
      tipo,
      subjetivo: { ...subjetivo, queixaPrincipal: subjetivo.queixaPrincipal },
      objetivo: clean(objetivo) ?? {},
      avaliacao: { ...clean(avaliacao), cid10: cidSelected.length ? cidSelected : undefined } ,
      plano: clean(plano) ?? {},
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo atendimento{pacienteNome ? ` — ${pacienteNome}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="naData">Data do atendimento</Label>
              <Input id="naData" type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de atendimento</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtendimento)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoAtendimento).map((t) => <SelectItem key={t} value={t}>{TIPO_ATENDIMENTO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isEnfermagem && (
          <>
          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">S — Subjetivo / Anamnese</p>
          <div className="space-y-2">
            <Label htmlFor="naQueixa">Queixa principal *</Label>
            <Textarea id="naQueixa" rows={2} value={subjetivo.queixaPrincipal ?? ''} onChange={(e) => setS({ queixaPrincipal: e.target.value })} />
          </div>
          <TextField label="História da doença atual (HDA)" value={subjetivo.hda} onChange={(v) => setS({ hda: v })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Antecedentes pessoais / comorbidades" value={subjetivo.antecedentesPessoais} onChange={(v) => setS({ antecedentesPessoais: v })} />
            <TextField label="Antecedentes cirúrgicos" value={subjetivo.antecedentesCirurgicos} onChange={(v) => setS({ antecedentesCirurgicos: v })} />
            <TextField label="Medicamentos em uso" value={subjetivo.medicamentosEmUso} onChange={(v) => setS({ medicamentosEmUso: v })} />
            <TextField label="Alergias" value={subjetivo.alergias} onChange={(v) => setS({ alergias: v })} />
            <TextField label="História familiar" value={subjetivo.historiaFamiliar} onChange={(v) => setS({ historiaFamiliar: v })} />
            <TextField label="História social (tabagismo, etilismo, ocupação)" value={subjetivo.historiaSocial} onChange={(v) => setS({ historiaSocial: v })} />
          </div>
          <TextField label="Revisão de sistemas" value={subjetivo.revisaoSistemas} onChange={(v) => setS({ revisaoSistemas: v })} />

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O — Objetivo / Exame físico</p>
          <TextField label="Estado geral" value={estadoGeral} onChange={setEstadoGeral} rows={2} placeholder="BEG, LOTE, hidratado, corado, afebril…" />
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2"><Label>PA</Label><Input placeholder="120/80" value={sinais.pressaoArterial ?? ''} onChange={(e) => setSV({ pressaoArterial: e.target.value })} /></div>
            <div className="space-y-2"><Label>FC (bpm)</Label><Input inputMode="numeric" value={sinais.frequenciaCardiaca ?? ''} onChange={(e) => setSV({ frequenciaCardiaca: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>FR (irpm)</Label><Input inputMode="numeric" value={sinais.frequenciaRespiratoria ?? ''} onChange={(e) => setSV({ frequenciaRespiratoria: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Tax (°C)</Label><Input inputMode="decimal" value={sinais.temperatura ?? ''} onChange={(e) => setSV({ temperatura: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>SatO₂ (%)</Label><Input inputMode="numeric" value={sinais.saturacaoO2 ?? ''} onChange={(e) => setSV({ saturacaoO2: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Peso (kg)</Label><Input inputMode="decimal" value={sinais.peso ?? ''} onChange={(e) => setSV({ peso: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Altura (cm)</Label><Input inputMode="numeric" value={sinais.altura ?? ''} onChange={(e) => setSV({ altura: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Dor (0–10)</Label><Input inputMode="numeric" value={sinais.escalaDor ?? ''} onChange={(e) => setSV({ escalaDor: num(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {EXAME_SEGMENTAR_CAMPOS.map(({ key, label }) => (
              <TextField key={key} label={label} value={seg[key]} onChange={(v) => setSeg2({ [key]: v })} />
            ))}
          </div>
          <TextField label="Outros achados" value={exameOutros} onChange={setExameOutros} />

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A — Avaliação</p>
          <TextField label="Hipótese diagnóstica" value={avaliacao.hipotesesDiagnosticas?.join('\n')} onChange={(v) => setA({ hipotesesDiagnosticas: v ? v.split('\n').map((s) => s.trim()).filter(Boolean) : undefined })} placeholder="Uma por linha" />
          <div className="space-y-2">
            <Label htmlFor="naCid">CID-10 {cidSelected.length > 0 && <span className="text-primary">({cidSelected.join(', ')})</span>}</Label>
            <Input id="naCid" placeholder="Digite para buscar (ex.: N31)" value={cidSearch} onChange={(e) => buscarCid(e.target.value)} />
            {cidOpts.length > 0 && (
              <div className="glass rounded-lg p-1 space-y-0.5 max-h-40 overflow-y-auto">
                {cidOpts.map((o) => (
                  <button key={o.value} type="button"
                    className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-secondary text-foreground"
                    onClick={() => { setCidSelected((cur) => cur.includes(o.value) ? cur : [...cur, o.value]); setCidSearch(''); setCidOpts([]); }}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            {cidSelected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cidSelected.map((c) => (
                  <Badge key={c} variant="secondary" className="cursor-pointer" onClick={() => setCidSelected((cur) => cur.filter((x) => x !== c))}>
                    {c} ✕
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <TextField label="Diagnóstico definitivo" value={avaliacao.diagnosticoDefinitivo} onChange={(v) => setA({ diagnosticoDefinitivo: v })} />
          <TextField label="Evolução" value={avaliacao.evolucao} onChange={(v) => setA({ evolucao: v })} />

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">P — Plano</p>
          <TextField label="Conduta" value={plano.conduta} onChange={(v) => setP({ conduta: v })} />
          <TextField label="Prescrição" value={plano.prescricao} onChange={(v) => setP({ prescricao: v })} />
          <TextField label="Exames solicitados" value={plano.examesSolicitados?.join('\n')} onChange={(v) => setP({ examesSolicitados: v ? v.split('\n').map((s) => s.trim()).filter(Boolean) : undefined })} placeholder="Um por linha" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Orientações" value={plano.orientacoes} onChange={(v) => setP({ orientacoes: v })} />
            <TextField label="Encaminhamentos" value={plano.encaminhamentos} onChange={(v) => setP({ encaminhamentos: v })} />
          </div>
          <div className="space-y-2"><Label>Retorno</Label><Input value={plano.retorno ?? ''} placeholder="Ex.: 30 dias / conforme necessidade" onChange={(e) => setP({ retorno: e.target.value })} /></div>
          </>
          )}

          {isEnfermagem && (
            <div className="space-y-4">
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registro de enfermagem — Estomaterapia</p>
              <TextField label="Motivo do atendimento" value={enf.motivoAtendimento} onChange={(v) => setE({ motivoAtendimento: v })} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Comorbidades relevantes" value={enf.comorbidadesRelevantes} onChange={(v) => setE({ comorbidadesRelevantes: v })} placeholder="Diabetes, doença vascular periférica…" />
                <TextField label="Mobilidade" value={enf.mobilidade} onChange={(v) => setE({ mobilidade: v })} placeholder="Acamado, deambula com auxílio…" />
                <div className="space-y-2">
                  <Label>Escore de Braden (6-23)</Label>
                  <Input type="number" min={6} max={23} value={enf.escoreBraden ?? ''} onChange={(e) => setE({ escoreBraden: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <TextField label="Estado nutricional" value={enf.estadoNutricional} onChange={(v) => setE({ estadoNutricional: v })} rows={1} />
                <div className="space-y-2">
                  <Label>Dor geral (0-10)</Label>
                  <Input type="number" min={0} max={10} value={enf.dorGeral ?? ''} onChange={(e) => setE({ dorGeral: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <TextField label="Curativo atual" value={enf.curativoAtual} onChange={(v) => setE({ curativoAtual: v })} placeholder="Cobertura em uso, frequência de troca" rows={1} />
              </div>
              <TextField label="Adesão ao tratamento / suporte familiar / acesso a curativos" value={enf.adesaoTratamento} onChange={(v) => setE({ adesaoTratamento: v })} />
              <TextField label="Orientações fornecidas" value={enf.orientacoesFornecidas} onChange={(v) => setE({ orientacoesFornecidas: v })} />
              <TextField label="Evolução" value={enf.evolucao} onChange={(v) => setE({ evolucao: v })} />
              <TextField label="Plano / próximos passos" value={enf.planoProximosPassos} onChange={(v) => setE({ planoProximosPassos: v })} />
              <div className="space-y-2">
                <Label>COREN do enfermeiro responsável</Label>
                <Input value={enf.coren ?? ''} onChange={(e) => setE({ coren: e.target.value })} placeholder="COREN 000000-SP" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Registrando...' : 'Registrar atendimento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
