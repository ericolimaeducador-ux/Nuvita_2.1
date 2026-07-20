import { useMemo, useState } from 'react';
import dayjs from 'dayjs';

/**
 * Gráficos do financeiro em SVG puro — o projeto não tem (nem precisa de) lib
 * de gráfico.
 *
 * CONVENÇÃO DE COR: entrada de caixa é emerald-600 `#059669`, saída é red-600
 * `#dc2626` — os mesmos tons já usados nos stat cards. O par foi validado contra
 * a superfície real dos cards (`#ffffff`): ΔE 8.6 sob deuteranopia (alvo ≥ 8),
 * ΔE 32 em visão normal e ambos ≥ 3:1 de contraste. O tom 500 usado antes
 * reprovava no contraste (emerald-500 = 2.54:1), por isso a mudança para 600.
 *
 * Dentro de um mesmo gráfico as barras têm UMA cor só: a categoria já está
 * rotulada no eixo, então pintar cada barra de um tom diferente duplicaria o
 * que o comprimento da barra já diz e gastaria o único canal livre.
 */

export const COR_RECEITA = '#059669';
export const COR_DESPESA = '#dc2626';

export function formatarValor(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Compacto para eixo/tick, onde o valor cheio não cabe. */
function formatarCompacto(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export interface ItemBarra {
  rotulo: string;
  valor: number;
  /** Linha de apoio opcional (ex.: "12 cobranças · ticket R$ 250,00"). */
  detalhe?: string;
}

/**
 * Barras horizontais para comparar magnitude entre poucas categorias nomeadas.
 * Horizontal porque os rótulos são longos ("Avaliação avulsa de ferida") e em
 * barra vertical eles teriam de girar.
 */
export function BarrasHorizontais({
  dados,
  cor,
  vazio = 'Sem dados no período.',
}: {
  dados: ItemBarra[];
  cor: string;
  vazio?: string;
}) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{vazio}</p>;
  }

  const max = Math.max(1, ...dados.map((d) => d.valor));

  return (
    <div className="space-y-3">
      {dados.map((d) => (
        <div key={d.rotulo} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{d.rotulo}</span>
            {/* Valor sempre visível: o tooltip nunca é o único jeito de ler. */}
            <span className="text-sm tabular-nums shrink-0">{formatarValor(d.valor)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-2 rounded-full transition-[width] duration-300"
              style={{ width: `${Math.max((d.valor / max) * 100, 1)}%`, backgroundColor: cor }}
            />
          </div>
          {d.detalhe && <p className="text-xs text-muted-foreground">{d.detalhe}</p>}
        </div>
      ))}
    </div>
  );
}

export interface PontoMensal {
  mes: string;
  receitas: number;
  despesas: number;
}

/**
 * Evolução mensal de entrada x saída: duas séries no MESMO eixo (nunca dois
 * eixos y — a relação entre duas escalas arbitrárias inventa correlação).
 *
 * Traz legenda (obrigatória com 2+ séries) e camada de hover com crosshair,
 * mas todo valor também está na tabela abaixo do gráfico — tooltip complementa,
 * não é o único caminho para o dado.
 */
export function EvolucaoMensal({ dados }: { dados: PontoMensal[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);

  const geometria = useMemo(() => {
    const largura = 760;
    const alturaPlot = 190;
    const padEsq = 48;
    const padDir = 16;
    const padTopo = 12;

    const max = Math.max(1, ...dados.flatMap((d) => [d.receitas, d.despesas]));
    const util = largura - padEsq - padDir;
    const passoX = util / Math.max(dados.length - 1, 1);
    // Com um único mês (período filtrado curto) não há linha a traçar: o ponto
    // vai para o centro em vez de ficar colado na borda esquerda com o resto
    // do plot vazio.
    const x = dados.length === 1 ? () => padEsq + util / 2 : (i: number) => padEsq + i * passoX;
    const y = (v: number) => padTopo + (1 - v / max) * (alturaPlot - padTopo);

    return { largura, alturaPlot, padEsq, padDir, padTopo, max, passoX, x, y };
  }, [dados]);

  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Sem movimentação no período.</p>;
  }

  const { largura, alturaPlot, padEsq, padDir, max, passoX, x, y } = geometria;
  const linha = (chave: 'receitas' | 'despesas') => dados.map((d, i) => `${x(i)},${y(d[chave])}`).join(' ');
  const ticks = [0, max / 2, max];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: COR_RECEITA }} /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: COR_DESPESA }} /> Saídas
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${largura} ${alturaPlot + 28}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label="Evolução mensal de entradas e saídas"
          onMouseLeave={() => setAtivo(null)}
        >
          {/* Grade e eixo: hairline sólido, um tom acima da superfície. */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padEsq}
                y1={y(t)}
                x2={largura - padDir}
                y2={y(t)}
                stroke="currentColor"
                strokeWidth={1}
                className="text-border"
              />
              <text x={padEsq - 8} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                {formatarCompacto(t)}
              </text>
            </g>
          ))}

          {dados.length > 1 && (
            <>
              <polyline points={linha('receitas')} fill="none" stroke={COR_RECEITA} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={linha('despesas')} fill="none" stroke={COR_DESPESA} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {ativo !== null && (
            <line x1={x(ativo)} y1={geometria.padTopo} x2={x(ativo)} y2={alturaPlot} stroke="currentColor" strokeWidth={1} className="text-border" />
          )}

          {dados.map((d, i) => (
            <g key={d.mes}>
              {/* Alvo de hover largo: não exige acertar o ponto de 8px. */}
              <rect
                x={x(i) - passoX / 2}
                y={0}
                width={passoX}
                height={alturaPlot}
                fill="transparent"
                onMouseEnter={() => setAtivo(i)}
              />
              {(ativo === i || dados.length <= 12) && (
                <>
                  {/* Anel da superfície separa os marcadores quando se sobrepõem. */}
                  <circle cx={x(i)} cy={y(d.receitas)} r={ativo === i ? 5 : 3.5} fill={COR_RECEITA} stroke="#ffffff" strokeWidth={2} />
                  <circle cx={x(i)} cy={y(d.despesas)} r={ativo === i ? 5 : 3.5} fill={COR_DESPESA} stroke="#ffffff" strokeWidth={2} />
                </>
              )}
              <text x={x(i)} y={alturaPlot + 20} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {dayjs(`${d.mes}-01`).format('MMM/YY')}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {ativo !== null && (
        <div className="rounded-md border bg-card px-3 py-2 text-xs">
          <span className="font-medium">{dayjs(`${dados[ativo].mes}-01`).format('MMMM [de] YYYY')}</span>
          <span className="ml-3" style={{ color: COR_RECEITA }}>
            Entradas {formatarValor(dados[ativo].receitas)}
          </span>
          <span className="ml-3" style={{ color: COR_DESPESA }}>
            Saídas {formatarValor(dados[ativo].despesas)}
          </span>
        </div>
      )}
    </div>
  );
}
