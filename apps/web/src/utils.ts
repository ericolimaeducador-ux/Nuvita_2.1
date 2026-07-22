import dayjs from 'dayjs';
import type { Endereco, PageResult } from '@/types';

/** Normaliza respostas de lista que podem vir como array puro ou paginado. */
export function toItems<T>(data: PageResult<T> | T[] | undefined | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? data.data ?? [];
}

export function formatCpf(cpf?: string): string {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCnpj(cnpj?: string): string {
  if (!cnpj) return '—';
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** (11) 94739-1805 / (11) 3333-4444 — o banco guarda so digitos. */
export function formatTelefone(telefone?: string): string {
  if (!telefone) return '—';
  const d = telefone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

export function idade(dataNascimento?: string): string {
  if (!dataNascimento) return '—';
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return '—';
  const diff = Date.now() - nasc.getTime();
  const anos = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return `${anos} anos`;
}

/**
 * Formata campos de DATA-CALENDÁRIO (nascimento, data de follow-up, vencimento…)
 * que a API grava como meia-noite UTC. `dayjs(iso).format(...)` converteria para
 * o fuso local e mostraria o dia ANTERIOR no Brasil (UTC-3); por isso usa só a
 * parte YYYY-MM-DD. Não usar em timestamps de evento (criadoEm, dataProtocolo…),
 * onde o horário local é o correto.
 */
export function formatData(value?: string | null): string {
  if (!value) return '—';
  return dayjs(value.slice(0, 10)).format('DD/MM/YYYY');
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** URL pública da sala de telemedicina — o profissional abre a dele; o paciente recebe a sua por WhatsApp/e-mail. */
export function linkDaSala(token: string): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return `${base.replace(/\/+$/, '')}/tele/${token}`;
}

/** Monta o endereço em uma linha legível, ignorando campos vazios. Retorna '—' se vazio. */
export function formatEndereco(e?: Endereco): string {
  if (!e) return '—';
  const linha1 = [e.logradouro, e.numero].filter(Boolean).join(', ');
  const complemento = e.complemento ? `(${e.complemento})` : '';
  const cidadeUf = [e.cidade, e.estado].filter(Boolean).join(' - ');
  const partes = [linha1, complemento, e.bairro, cidadeUf, e.cep].filter(Boolean);
  return partes.length ? partes.join(' · ') : '—';
}
