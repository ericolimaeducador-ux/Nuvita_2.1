import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { agendaApi } from '@/api/resources';
import { DocumentoTimbreClinica, DocumentoRodapeClinica } from '@/components/DocumentoTimbreClinica';
import { formatCpf } from '@/utils';

export function DeclaracaoComparecimentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const declaracaoQ = useQuery({
    queryKey: ['agendamentos', id, 'declaracao-comparecimento'],
    queryFn: () => agendaApi.declaracaoComparecimento(id!),
    enabled: !!id,
    retry: false,
  });
  const d = declaracaoQ.data;

  if (declaracaoQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (declaracaoQ.isError || !d) {
    return (
      <div className="p-8 text-center text-gray-500">
        Não foi possível emitir a declaração. Só é possível emitir para um atendimento já concluído.
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Prévia da Declaração de Comparecimento</span>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="declaracao-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:min-h-0 print:max-w-full text-sm">
        <DocumentoTimbreClinica />

        <h1 className="text-base font-bold uppercase tracking-wide text-center border-b-2 border-gray-800 pb-4 mb-8">
          Declaração de Comparecimento
        </h1>

        <p className="leading-relaxed text-justify mb-10">
          Declaramos para os devidos fins que{' '}
          <span className="font-semibold">{d.pacienteNome ?? '—'}</span>
          {d.pacienteCpf && <>, portador(a) do CPF <span className="font-semibold">{formatCpf(d.pacienteCpf)}</span></>},
          esteve presente nesta unidade de saúde no dia{' '}
          <span className="font-semibold">{dayjs(d.dataHoraInicio).format('DD/MM/YYYY')}</span>, das{' '}
          <span className="font-semibold">{dayjs(d.dataHoraInicio).format('HH:mm')}</span> às{' '}
          <span className="font-semibold">{dayjs(d.dataHoraFim).format('HH:mm')}</span>, para atendimento de
          estomaterapia.
        </p>

        <div className="mt-16 print:mt-10 flex justify-between items-end break-inside-avoid">
          <div className="text-center min-w-52">
            <div className="border-t-2 border-gray-800 pt-1">
              <p className="text-sm font-semibold">{d.profissionalNome ?? 'Profissional Responsável'}</p>
              {d.profissionalRegistro && <p className="text-xs text-gray-500">{d.profissionalRegistro}</p>}
            </div>
          </div>
          <div className="text-sm text-gray-500 text-right">
            <p>Local e data:</p>
            <p>_____________________________</p>
          </div>
        </div>

        <DocumentoRodapeClinica />
      </div>

      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .declaracao-print {
            color: #111 !important;
            background: white !important;
            font-size: 10pt;
            padding: 10mm 14mm !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </>
  );
}
