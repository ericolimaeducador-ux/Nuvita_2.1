import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { financeiroApi, pacientesApi, clinicasApi } from '@/api/resources';
import { DocumentoTimbreClinica, DocumentoRodapeClinica } from '@/components/DocumentoTimbreClinica';
import { formatBRL, formatCpf, formatCnpj } from '@/utils';
import {
  StatusLancamento, CATEGORIA_LANCAMENTO_LABEL, FORMA_PAGAMENTO_LABEL,
} from '@/types';

export function ComprovantePagamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paraReembolso = searchParams.get('reembolso') === '1';

  const lancamentoQ = useQuery({
    queryKey: ['financeiro', 'lancamento', id],
    queryFn: () => financeiroApi.get(id!),
    enabled: !!id,
  });
  const l = lancamentoQ.data;

  const pacienteQ = useQuery({
    queryKey: ['paciente', l?.pacienteId],
    queryFn: () => pacientesApi.get(l!.pacienteId!),
    enabled: !!l?.pacienteId,
  });

  const instituicoesQ = useQuery({
    queryKey: ['financeiro', 'instituicoes', 'todas'],
    queryFn: () => financeiroApi.listInstituicoes(true),
    enabled: !!l?.instituicaoId,
  });
  const instituicao = instituicoesQ.data?.find((i) => i.id === l?.instituicaoId);

  const clinicaQ = useQuery({ queryKey: ['clinica', 'me'], queryFn: clinicasApi.me });

  if (lancamentoQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!l) {
    return <div className="p-8">Lançamento não encontrado.</div>;
  }

  const podeEmitir = l.status === StatusLancamento.RECEBIDO;

  return (
    <>
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Prévia do {paraReembolso ? 'Recibo para Reembolso' : 'Comprovante de Pagamento'}
        </span>
        {podeEmitir && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => setSearchParams(paraReembolso ? {} : { reembolso: '1' })}
          >
            {paraReembolso ? 'Ver comprovante padrão' : 'Ver recibo para reembolso'}
          </Button>
        )}
        {podeEmitir && (
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
          </Button>
        )}
      </div>

      <div className="comprovante-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:min-h-0 print:max-w-full text-sm">
        <DocumentoTimbreClinica />

        {!podeEmitir ? (
          <p className="text-center text-gray-500 py-12">
            Este lançamento está {l.status === StatusLancamento.PENDENTE ? 'pendente' : 'cancelado'} — só é
            possível emitir comprovante de pagamentos já recebidos.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
              <h1 className="text-base font-bold uppercase tracking-wide">
                {paraReembolso ? 'Recibo para Reembolso' : 'Comprovante de Pagamento'}
              </h1>
              <div className="text-right text-xs text-gray-500">
                <p>Recebido em: {l.recebidoEm ? dayjs(l.recebidoEm).format('DD/MM/YYYY HH:mm') : '—'}</p>
              </div>
            </div>

            {paraReembolso && (
              <section className="mb-5">
                <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Prestador</h2>
                <div className="space-y-1">
                  <div><span className="font-semibold">Clínica:</span> {clinicaQ.data?.nome ?? '—'}</div>
                  <div><span className="font-semibold">CNPJ:</span> {clinicaQ.data ? formatCnpj(clinicaQ.data.cnpj) : '—'}</div>
                  {clinicaQ.data?.configuracoes.responsavelTecnico && (
                    <div>
                      <span className="font-semibold">Responsável técnico:</span>{' '}
                      {clinicaQ.data.configuracoes.responsavelTecnico.nome} —{' '}
                      {clinicaQ.data.configuracoes.responsavelTecnico.registroProfissional}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">
                {l.pacienteId ? 'Paciente' : 'Cliente institucional'}
              </h2>
              {l.pacienteId ? (
                <div className="space-y-1">
                  <div><span className="font-semibold">Nome:</span> {pacienteQ.data?.nome ?? '—'}</div>
                  <div><span className="font-semibold">CPF:</span> {formatCpf(pacienteQ.data?.cpf)}</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div><span className="font-semibold">Nome:</span> {instituicao?.nome ?? '—'}</div>
                  <div><span className="font-semibold">CNPJ:</span> {formatCnpj(instituicao?.cnpj)}</div>
                </div>
              )}
            </section>

            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Pagamento</h2>
              <div className="space-y-1">
                <div><span className="font-semibold">Descrição:</span> {l.descricao}</div>
                {l.categoria && (
                  <div><span className="font-semibold">Categoria:</span> {CATEGORIA_LANCAMENTO_LABEL[l.categoria]}</div>
                )}
                {l.formaPagamento && (
                  <div><span className="font-semibold">Forma de pagamento:</span> {FORMA_PAGAMENTO_LABEL[l.formaPagamento]}</div>
                )}
                <div className="text-base pt-1"><span className="font-semibold">Valor:</span> {formatBRL(l.valor)}</div>
              </div>
            </section>

            <p className="text-xs text-gray-500 mt-8 border-t border-gray-300 pt-3">
              {paraReembolso
                ? 'Documento emitido para fins de reembolso junto a convênio/seguradora. Não substitui nota fiscal.'
                : 'Comprovante de pagamento — este documento não substitui nota fiscal.'}
            </p>
          </>
        )}

        <DocumentoRodapeClinica />
      </div>

      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .comprovante-print {
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
