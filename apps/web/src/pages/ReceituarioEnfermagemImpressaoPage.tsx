import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { receituarioEnfermagemApi, pacientesApi } from '@/api/resources';
import { useAuth } from '@/auth/AuthContext';
import { DocumentoTimbreClinica, DocumentoRodapeClinica } from '@/components/DocumentoTimbreClinica';

export function ReceituarioEnfermagemImpressaoPage() {
  const { id: pacienteId, receituarioId } = useParams<{ id: string; receituarioId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const receituarioQ = useQuery({
    queryKey: ['receituario-enfermagem', receituarioId],
    queryFn: () => receituarioEnfermagemApi.get(receituarioId!),
    enabled: !!receituarioId,
  });
  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });

  const r = receituarioQ.data;
  const paciente = pacienteQ.data;

  if (receituarioQ.isLoading || pacienteQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!r) {
    return <div className="p-8">Receituário não encontrado.</div>;
  }

  // O emissor é sempre o enfermeiro logado no momento da emissão (fluxo
  // ponta-a-ponta na mesma sessão) — evita buscar outro usuário por id.
  const enfermeiroNome = r.enfermeiroId === user?.id ? user?.nome : undefined;

  return (
    <>
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Prévia do Receituário de Enfermagem</span>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="receituario-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:min-h-0 print:max-w-full text-sm">
        <DocumentoTimbreClinica />

        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-base font-bold uppercase tracking-wide">Receituário de Enfermagem</h1>
          <div className="text-right text-xs text-gray-500">
            <p>Emitido em: {dayjs(r.criadoEm).format('DD/MM/YYYY HH:mm')}</p>
          </div>
        </div>

        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Paciente</h2>
          <div><span className="font-semibold">Nome:</span> {paciente?.nome ?? '—'}</div>
        </section>

        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">
            Insumos prescritos para curativo
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-300">
                <th className="py-1 pr-2">Item</th>
                <th className="py-1 pr-2 w-16">Qtd.</th>
                <th className="py-1">Instruções de uso</th>
              </tr>
            </thead>
            <tbody>
              {r.itens.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 align-top">
                  <td className="py-1.5 pr-2 font-medium">{item.nome}</td>
                  <td className="py-1.5 pr-2">{item.quantidade}</td>
                  <td className="py-1.5">{item.instrucoesUso}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.observacoes && (
            <p className="mt-3"><span className="font-semibold">Observações:</span> {r.observacoes}</p>
          )}
        </section>

        <div className="mt-16 print:mt-10 flex justify-between items-end break-inside-avoid">
          <div className="text-center min-w-52">
            <div className="border-t-2 border-gray-800 pt-1">
              <p className="text-sm font-semibold">{enfermeiroNome ?? 'Enfermeiro(a) Responsável'}</p>
              {user?.registroProfissional && <p className="text-xs text-gray-500">{user.registroProfissional}</p>}
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
          .receituario-print {
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
