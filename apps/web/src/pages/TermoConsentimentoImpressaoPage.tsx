import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { termosConsentimentoApi, pacientesApi } from '@/api/resources';
import { DocumentoTimbreClinica, DocumentoRodapeClinica } from '@/components/DocumentoTimbreClinica';
import { TIPO_TERMO_LABEL } from '@/types';

export function TermoConsentimentoImpressaoPage() {
  const { id: pacienteId, termoId } = useParams<{ id: string; termoId: string }>();
  const navigate = useNavigate();

  const termoQ = useQuery({
    queryKey: ['termos-consentimento', termoId],
    queryFn: () => termosConsentimentoApi.get(termoId!),
    enabled: !!termoId,
  });
  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });

  const t = termoQ.data;
  const paciente = pacienteQ.data;

  if (termoQ.isLoading || pacienteQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!t) {
    return <div className="p-8">Termo não encontrado.</div>;
  }

  return (
    <>
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Prévia do Termo de Consentimento</span>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="termo-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:min-h-0 print:max-w-full text-sm">
        <DocumentoTimbreClinica />

        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-base font-bold uppercase tracking-wide">Termo de Consentimento Livre e Esclarecido</h1>
          <p className="text-xs text-gray-500 mt-0.5">{TIPO_TERMO_LABEL[t.tipo]}</p>
        </div>

        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Paciente</h2>
          <div><span className="font-semibold">Nome:</span> {paciente?.nome ?? '—'}</div>
        </section>

        <section className="mb-6 whitespace-pre-line leading-relaxed">{t.texto}</section>

        {t.assinatura ? (
          <div className="border border-gray-400 rounded-lg p-4 break-inside-avoid">
            <p className="text-sm font-semibold text-emerald-700">✓ Assinado digitalmente</p>
            <div className="text-xs text-gray-600 mt-2 space-y-0.5">
              <p><span className="font-semibold">Assinado por:</span> {t.assinatura.nomeAssinante}</p>
              <p><span className="font-semibold">Data/hora:</span> {dayjs(t.assinatura.dataAssinatura).format('DD/MM/YYYY HH:mm')}</p>
              <p className="font-mono break-all"><span className="font-semibold font-sans">Hash:</span> {t.assinatura.hash}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-amber-600 py-6">Este termo ainda não foi assinado.</p>
        )}

        <DocumentoRodapeClinica />
      </div>

      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .termo-print {
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
