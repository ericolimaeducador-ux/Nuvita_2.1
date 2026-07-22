import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Produto } from '@/types';

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

interface OpcaoExtra {
  value: string;
  label: string;
}

/**
 * Combobox de produto com busca por nome (digitando) e por código, para uso
 * em telas com dezenas de itens no catálogo (ex.: receituário) onde um
 * <Select> comum viraria uma lista longa sem filtro.
 */
export function ProdutoCombobox({
  produtos,
  value,
  onSelect,
  extraOption,
  placeholder = 'Selecionar produto...',
}: {
  produtos: Produto[];
  value: string;
  onSelect: (produtoId: string) => void;
  extraOption?: OpcaoExtra;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');

  /**
   * Busca por qualquer termo, em qualquer ordem, sobre nome + codigo +
   * categoria clinica + fabricante. O `nome` do produto e a marca comercial
   * (Duoderm, Mepilex...), entao buscar so por ele nao encontra nada quando o
   * enfermeiro digita o vocabulario da pratica ("curativo", "espuma",
   * "alginato", "prata") — dai a categoria e o fabricante entrarem no indice.
   */
  const filtrados = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return produtos;
    return produtos.filter((p) => {
      const alvo = normalizar([p.nome, p.codigo, p.subcategoria, p.fabricante].filter(Boolean).join(' '));
      return termos.every((t) => alvo.includes(t));
    });
  }, [produtos, busca]);

  const selecionado = produtos.find((p) => p.id === value);
  const label = selecionado ? selecionado.nome : extraOption && value === extraOption.value ? extraOption.label : placeholder;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setBusca(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={cn('truncate text-left', !selecionado && !(extraOption && value === extraOption.value) && 'text-muted-foreground')}>
            {label}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <Input
          autoFocus
          placeholder="Buscar por nome ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-2"
        />
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {extraOption && (
            <button
              type="button"
              onClick={() => { onSelect(extraOption.value); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent"
            >
              <Check className={cn('h-4 w-4 shrink-0', value === extraOption.value ? 'opacity-100' : 'opacity-0')} />
              <span className="italic text-muted-foreground">{extraOption.label}</span>
            </button>
          )}
          {filtrados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p.id); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent"
            >
              <Check className={cn('h-4 w-4 shrink-0', value === p.id ? 'opacity-100' : 'opacity-0')} />
              <span className="flex-1 min-w-0">
                <span className="block truncate">{p.nome}</span>
                {p.subcategoria && (
                  <span className="block truncate text-xs text-muted-foreground">{p.subcategoria}</span>
                )}
              </span>
              {p.codigo && <span className="shrink-0 text-xs text-muted-foreground">{p.codigo}</span>}
            </button>
          ))}
          {filtrados.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground text-center">Nenhum produto encontrado.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
