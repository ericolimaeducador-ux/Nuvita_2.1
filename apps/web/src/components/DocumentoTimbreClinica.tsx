import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { clinicasApi } from '@/api/resources';
import { formatCnpj, formatEndereco, formatTelefone } from '@/utils';

/**
 * Timbre (cabeçalho) da CLÍNICA para documentos que representam a clínica
 * perante paciente/convênio (comprovante, receituário, declaração, termo de
 * consentimento) — diferente de `DocumentoTimbre`, que é a marca da Nuvita
 * (o software) e serve só o prontuário impresso.
 */
export function DocumentoTimbreClinica() {
  const { data: clinica } = useQuery({ queryKey: ['clinica', 'me'], queryFn: clinicasApi.me });

  return (
    <header className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-gray-300">
      <div className="flex items-center gap-3">
        {clinica?.configuracoes.logoUrl ? (
          /* O logo ja traz o nome da clinica desenhado; repetir em texto ao lado
             duplicaria a marca no timbre. O nome so aparece no fallback. */
          <img src={clinica.configuracoes.logoUrl} alt={clinica.nome} className="h-14 w-auto object-contain" />
        ) : (
          <>
            <Building2 className="h-10 w-10 text-gray-400" />
            <p className="font-semibold text-gray-800 text-sm">{clinica?.nome ?? '—'}</p>
          </>
        )}
      </div>
      <div className="text-right text-[10px] leading-snug text-gray-600">
        <p>CNPJ {clinica ? formatCnpj(clinica.cnpj) : '—'}</p>
        <p>{formatEndereco(clinica?.endereco)}</p>
        {clinica?.telefone && <p>{formatTelefone(clinica.telefone)}</p>}
      </div>
    </header>
  );
}

/** Rodapé padrão para documentos gerados em nome da clínica (não da Nuvita). */
export function DocumentoRodapeClinica() {
  const { data: clinica } = useQuery({ queryKey: ['clinica', 'me'], queryFn: clinicasApi.me });

  return (
    <footer className="mt-10 pt-3 border-t border-gray-300 text-center text-[9px] text-gray-500 leading-snug">
      <p>
        {clinica?.nome ?? '—'} · CNPJ {clinica ? formatCnpj(clinica.cnpj) : '—'}
      </p>
      <p>
        {formatEndereco(clinica?.endereco)}
        {clinica?.telefone ? ` · ${formatTelefone(clinica.telefone)}` : ''}
      </p>
    </footer>
  );
}
