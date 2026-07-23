import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Camera, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { analiseFotoApi, avaliacaoFeridaApi, feridasApi, type AnaliseFotoFerida } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import {
  AchadoPerilesional, ACHADO_PERILESIONAL_LABEL,
  BordasFerida, BORDAS_FERIDA_LABEL,
  Etiologia, ETIOLOGIA_LABEL,
  NivelExsudato, NIVEL_EXSUDATO_LABEL,
  SinalInfeccaoResvech, SINAL_INFECCAO_RESVECH_LABEL,
  TecidosAfetados, TECIDOS_AFETADOS_LABEL,
} from '@/types';

/** Vocabulário da análise de foto → níveis de exsudato do formulário. */
const EXSUDATO_POR_ANALISE: Record<string, NivelExsudato> = {
  ausente: NivelExsudato.NENHUM,
  escasso: NivelExsudato.BAIXO,
  moderado: NivelExsudato.MODERADO,
  abundante: NivelExsudato.ALTO,
};

/**
 * Botão de análise auxiliar da foto. Pré-preenche o perfil tecidual e o
 * exsudato; não salva nada e não substitui o exame do enfermeiro — daí o aviso
 * de confiança no toast e a insistência em conferir antes de salvar.
 *
 * A imagem é enviada a um serviço de IA de terceiro. Vale a mesma exigência de
 * base legal do restante do dado clínico, com o agravante de ser imagem
 * corporal identificável.
 */
function AnalisarFotoButton({ onAnalisado }: { onAnalisado: (a: AnaliseFotoFerida) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const mut = useMutation({
    mutationFn: async (file: File) => {
      const permitidos = ['image/jpeg', 'image/png', 'image/webp'] as const;
      const tipo = permitidos.find((t) => t === file.type);
      if (!tipo) throw new Error('Use uma imagem JPEG, PNG ou WebP.');

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        // readAsDataURL devolve "data:<mime>;base64,<dados>"; a API quer só os dados.
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
        reader.readAsDataURL(file);
      });

      return analiseFotoApi.analisar(base64, tipo);
    },
    onSuccess: onAnalisado,
    onError: (e) => toast.error('Não foi possível analisar a foto', apiErrorMessage(e)),
  });

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Limpa o valor para permitir reenviar o mesmo arquivo depois.
          e.target.value = '';
          if (file) mut.mutate(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={mut.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        {mut.isPending ? 'Analisando...' : 'Analisar foto com IA'}
      </Button>
    </>
  );
}

// Valor sentinela dos selects do RESVECH — Radix Select não aceita item com
// value vazio, e "não avaliar" precisa ser uma escolha explícita e reversível.
const NAO_AVALIADO = 'nao_avaliado';

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

type Ponto = { x: number; y: number };
type PassoMedicao = 'marcador' | 'comprimento' | 'largura';

const PASSO_LABEL: Record<PassoMedicao, string> = {
  marcador: 'Marque as duas pontas do objeto de referência (moeda, régua, cartão…)',
  comprimento: 'Marque o maior eixo da ferida (comprimento)',
  largura: 'Marque o eixo perpendicular (largura)',
};

const PASSO_COR: Record<PassoMedicao, string> = {
  marcador: '#F59E0B', // amber — objeto de referência
  comprimento: '#3B82F6', // azul — comprimento
  largura: '#EF4444', // vermelho — largura
};

function distancia(a: Ponto, b: Ponto): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Mede comprimento/largura da ferida a partir de uma foto com um objeto de
 * tamanho conhecido ao lado (marcador) — o enfermeiro marca as duas pontas
 * do marcador e informa seu tamanho real; a mesma marcação, feita para o
 * comprimento e a largura da ferida, dá a distância em pixels que, pela
 * escala do marcador, vira centímetros. Sem detecção automática de imagem:
 * a marcação é sempre manual, revisável antes de usar (mesma régua de
 * "exige revisão humana" do resto do motor clínico).
 */
function MedicaoPorFotoDialog({
  open, onOpenChange, onMedido,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onMedido: (m: { comprimentoCm: number; larguraCm: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [temImagem, setTemImagem] = useState(false);
  const [passo, setPasso] = useState<PassoMedicao>('marcador');
  const [pontosPorPasso, setPontosPorPasso] = useState<Record<PassoMedicao, Ponto[]>>({
    marcador: [], comprimento: [], largura: [],
  });
  const [tamanhoMarcadorCm, setTamanhoMarcadorCm] = useState('');

  function resetar() {
    setTemImagem(false);
    setPasso('marcador');
    setPontosPorPasso({ marcador: [], comprimento: [], largura: [] });
    setTamanhoMarcadorCm('');
    imgRef.current = null;
  }

  function redesenhar() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    (Object.keys(pontosPorPasso) as PassoMedicao[]).forEach((p) => {
      const pontos = pontosPorPasso[p];
      if (pontos.length === 0) return;
      ctx.strokeStyle = PASSO_COR[p];
      ctx.fillStyle = PASSO_COR[p];
      ctx.lineWidth = 3;
      pontos.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      if (pontos.length === 2) {
        ctx.beginPath();
        ctx.moveTo(pontos[0].x, pontos[0].y);
        ctx.lineTo(pontos[1].x, pontos[1].y);
        ctx.stroke();
      }
    });
  }

  useEffect(redesenhar);

  // O canvas só existe no DOM depois que `temImagem` vira true (é renderizado
  // condicionalmente) — por isso o dimensionamento/desenho inicial da imagem
  // acontece aqui, não dentro do onload do <img>, que roda antes do canvas montar.
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!temImagem || !canvas || !img) return;
    const larguraMax = Math.min(canvas.parentElement?.clientWidth ?? 560, 560);
    canvas.width = larguraMax;
    canvas.height = (img.naturalHeight / img.naturalWidth) * larguraMax;
    redesenhar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temImagem]);

  function onEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setTemImagem(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function onClicarCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const atuais = pontosPorPasso[passo];
    if (atuais.length >= 2) return; // passo já completo — usar "Refazer" pra corrigir
    // O canvas é exibido com `w-full` (esticado ao container), mas o buffer
    // interno tem largura fixa (`canvas.width`, até 560). getBoundingClientRect
    // dá o tamanho EXIBIDO — sem reescalar para o buffer, o ponto marcado
    // desliza do ponto clicado, com erro crescente longe do canto superior
    // esquerdo. A escala buffer/exibição alinha o clique ao pixel real.
    const rect = canvas.getBoundingClientRect();
    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;
    const ponto = { x: (e.clientX - rect.left) * escalaX, y: (e.clientY - rect.top) * escalaY };
    setPontosPorPasso((prev) => ({ ...prev, [passo]: [...prev[passo], ponto] }));
  }

  function refazerPasso() {
    setPontosPorPasso((prev) => ({ ...prev, [passo]: [] }));
  }

  const marcadorPronto = pontosPorPasso.marcador.length === 2 && Number(tamanhoMarcadorCm) > 0;
  const comprimentoPronto = pontosPorPasso.comprimento.length === 2;
  const larguraPronto = pontosPorPasso.largura.length === 2;

  const escalaCmPorPx = marcadorPronto
    ? Number(tamanhoMarcadorCm) / distancia(pontosPorPasso.marcador[0], pontosPorPasso.marcador[1])
    : undefined;
  const comprimentoCm = escalaCmPorPx && comprimentoPronto
    ? distancia(pontosPorPasso.comprimento[0], pontosPorPasso.comprimento[1]) * escalaCmPorPx
    : undefined;
  const larguraCm = escalaCmPorPx && larguraPronto
    ? distancia(pontosPorPasso.largura[0], pontosPorPasso.largura[1]) * escalaCmPorPx
    : undefined;

  function avancar() {
    if (passo === 'marcador' && marcadorPronto) setPasso('comprimento');
    else if (passo === 'comprimento' && comprimentoPronto) setPasso('largura');
  }

  function usarMedidas() {
    if (comprimentoCm === undefined || larguraCm === undefined) return;
    onMedido({ comprimentoCm: Math.round(comprimentoCm * 10) / 10, larguraCm: Math.round(larguraCm * 10) / 10 });
    onOpenChange(false);
    resetar();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetar(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medir pela foto</DialogTitle>
          <DialogDescription>
            Fotografe a ferida ao lado de um objeto de tamanho conhecido (moeda, régua, cartão) e
            marque as pontas na imagem — a medida sai da escala do objeto, mas continua conferível
            e ajustável antes de salvar.
          </DialogDescription>
        </DialogHeader>

        {!temImagem ? (
          <div className="space-y-2">
            <Label>Foto da ferida com o objeto de referência</Label>
            <Input type="file" accept="image/*" capture="environment" onChange={onEscolherArquivo} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium" style={{ color: PASSO_COR[passo] }}>{PASSO_LABEL[passo]}</p>
              {passo === 'marcador' && pontosPorPasso.marcador.length === 2 && (
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-xs shrink-0">Tamanho real do objeto (cm)</Label>
                  <Input
                    className="max-w-28 h-8"
                    type="number" step="0.1" min="0.1"
                    value={tamanhoMarcadorCm}
                    onChange={(e) => setTamanhoMarcadorCm(e.target.value)}
                    placeholder="ex.: 2,7"
                  />
                </div>
              )}
            </div>

            <canvas
              ref={canvasRef}
              onClick={onClicarCanvas}
              className="w-full rounded-lg border cursor-crosshair touch-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {comprimentoCm !== undefined && `Comprimento: ${comprimentoCm.toFixed(1)}cm`}
                {comprimentoCm !== undefined && larguraCm !== undefined && ' · '}
                {larguraCm !== undefined && `Largura: ${larguraCm.toFixed(1)}cm`}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={refazerPasso}>
                Refazer este passo
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {temImagem && passo !== 'largura' && (
            <Button
              type="button"
              onClick={avancar}
              disabled={passo === 'marcador' ? !marcadorPronto : !comprimentoPronto}
            >
              Próximo
            </Button>
          )}
          {temImagem && passo === 'largura' && (
            <Button type="button" onClick={usarMedidas} disabled={comprimentoCm === undefined || larguraCm === undefined}>
              Usar estas medidas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Formulário de nova avaliação de ferida, sem moldura própria — reusado
 * dentro do `NovaAvaliacaoFeridaDialog` (paciente/ferida já com página
 * própria) e embutido na tela de atendimento por telemedicina (o enfermeiro
 * avalia a ferida sem sair da tela, ao lado do vídeo).
 */
export function AvaliacaoFeridaForm({
  feridaId, onCreated, onCancel,
}: {
  feridaId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { register, handleSubmit, watch, setValue, reset } = useForm<Record<string, unknown>>({
    defaultValues: { exsudato: NivelExsudato.NENHUM, escalaDor: 0 },
  });
  const [achados, setAchados] = useState<AchadoPerilesional[]>([]);
  const [sinaisInfeccao, setSinaisInfeccao] = useState<SinalInfeccaoResvech[]>([]);
  const [medirPelaFotoOpen, setMedirPelaFotoOpen] = useState(false);

  const somaTecido = useMemo(() => {
    const n = (v: unknown) => Number(v) || 0;
    return n(watch('granulacaoPct')) + n(watch('epitelizacaoPct')) + n(watch('esfaceloPct')) + n(watch('necrosePct'));
  }, [watch('granulacaoPct'), watch('epitelizacaoPct'), watch('esfaceloPct'), watch('necrosePct')]);

  function toggleAchado(a: AchadoPerilesional) {
    setAchados((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  function toggleSinalInfeccao(s: SinalInfeccaoResvech) {
    setSinaisInfeccao((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  const bordas = watch('bordas') as string | undefined;
  const tecidosAfetados = watch('tecidosAfetados') as string | undefined;
  const resvechPreenchido = !!bordas && bordas !== NAO_AVALIADO && !!tecidosAfetados && tecidosAfetados !== NAO_AVALIADO;
  const resvechParcial =
    !resvechPreenchido &&
    ((!!bordas && bordas !== NAO_AVALIADO) || (!!tecidosAfetados && tecidosAfetados !== NAO_AVALIADO));

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
        bordas: resvechPreenchido ? (v.bordas as BordasFerida) : undefined,
        tecidosAfetados: resvechPreenchido ? (v.tecidosAfetados as TecidosAfetados) : undefined,
        sinaisInfeccao: resvechPreenchido && sinaisInfeccao.length > 0 ? sinaisInfeccao : undefined,
      });
    },
    onSuccess: (avaliacao) => {
      const risco = avaliacao.recomendacoes[0]?.risco;
      const partes = [risco ? `Maior risco identificado: ${risco}.` : undefined];
      if (avaliacao.escalas) {
        partes.push(`PUSH ${avaliacao.escalas.push.total}/17`);
        if (avaliacao.escalas.resvech) partes.push(`RESVECH ${avaliacao.escalas.resvech.total}/35`);
      }
      toast.success('Avaliação registrada.', partes.filter(Boolean).join(' · ') || undefined);
      reset();
      setAchados([]);
      setSinaisInfeccao([]);
      onCreated();
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Medidas</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setMedirPelaFotoOpen(true)}>
              <Camera className="h-3.5 w-3.5 mr-1.5" /> Medir pela foto
            </Button>
          </div>
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
          <MedicaoPorFotoDialog
            open={medirPelaFotoOpen}
            onOpenChange={setMedirPelaFotoOpen}
            onMedido={({ comprimentoCm, larguraCm }) => {
              setValue('comprimentoCm', comprimentoCm);
              setValue('larguraCm', larguraCm);
              toast.success('Medidas preenchidas.', 'Confira e ajuste se necessário antes de salvar.');
            }}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={somaTecido > 100 ? 'text-destructive' : undefined}>
                Perfil tecidual (%) — soma: {somaTecido}{somaTecido > 100 ? ' (excede 100!)' : ''}
              </Label>
              <AnalisarFotoButton
                onAnalisado={(a) => {
                  const t = a.percentuaisTecido;
                  if (t) {
                    setValue('granulacaoPct', t.granulacao);
                    setValue('epitelizacaoPct', t.epitelizacao);
                    // "fibrina" no vocabulário da análise = esfacelo no formulário.
                    setValue('esfaceloPct', t.fibrina);
                    setValue('necrosePct', t.necrose);
                  }
                  if (a.exsudatoVisivel) setValue('exsudato', EXSUDATO_POR_ANALISE[a.exsudatoVisivel]);
                  toast.success(
                    `Campos pré-preenchidos (confiança ${a.confianca ?? 'não informada'}).`,
                    'Análise auxiliar — confira cada campo antes de salvar.',
                  );
                }}
              />
            </div>
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

          <div className="space-y-2 rounded-md border p-3">
            <Label className="font-medium">RESVECH 2.0 (opcional)</Label>
            <p className="text-xs text-muted-foreground">
              Preencha bordas e tecidos afetados para pontuar a escala. O PUSH 3.0 é calculado automaticamente em toda avaliação.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bordas da lesão</Label>
                <Select value={bordas ?? NAO_AVALIADO} onValueChange={(v) => setValue('bordas', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NAO_AVALIADO}>Não avaliar</SelectItem>
                    {Object.values(BordasFerida).map((b) => (
                      <SelectItem key={b} value={b}>{BORDAS_FERIDA_LABEL[b]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tecido mais profundo afetado</Label>
                <Select value={tecidosAfetados ?? NAO_AVALIADO} onValueChange={(v) => setValue('tecidosAfetados', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NAO_AVALIADO}>Não avaliar</SelectItem>
                    {Object.values(TecidosAfetados).map((t) => (
                      <SelectItem key={t} value={t}>{TECIDOS_AFETADOS_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {resvechParcial && (
              <p className="text-xs text-destructive">Preencha os dois campos (ou deixe ambos em "Não avaliar").</p>
            )}
            {resvechPreenchido && (
              <div className="space-y-2">
                <Label className="text-xs">Sinais de infecção/inflamação (os demais são derivados dos campos acima)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(SinalInfeccaoResvech).map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <Checkbox id={`sinf_${s}`} checked={sinaisInfeccao.includes(s)} onCheckedChange={() => toggleSinalInfeccao(s)} />
                      <Label htmlFor={`sinf_${s}`} className="text-sm cursor-pointer">{SINAL_INFECCAO_RESVECH_LABEL[s]}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending || somaTecido > 100 || resvechParcial}>
              {mut.isPending ? 'Salvando...' : 'Registrar avaliação'}
            </Button>
          </DialogFooter>
        </form>
  );
}

/** Dialog fino em torno do `AvaliacaoFeridaForm` — usado onde a ferida já
 * tem página própria (ex.: `FeridaDetailPage`), sem vídeo ao lado. */
export function NovaAvaliacaoFeridaDialog({
  open, onOpenChange, feridaId, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  feridaId: string;
  onCreated: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova avaliação de ferida</DialogTitle></DialogHeader>
        <AvaliacaoFeridaForm
          feridaId={feridaId}
          onCancel={() => onOpenChange(false)}
          onCreated={() => { onOpenChange(false); onCreated(); }}
        />
      </DialogContent>
    </Dialog>
  );
}
