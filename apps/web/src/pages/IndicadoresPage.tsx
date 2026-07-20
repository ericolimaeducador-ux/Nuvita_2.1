import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Users, CalendarCheck, Send, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { indicadoresApi, type IndicadoresParams } from '@/api/resources';
import { BarrasHorizontais, COR_CONTAGEM, type ItemBarra } from '@/components/charts/FinanceiroCharts';
import {
  STATUS_AGENDAMENTO_LABEL,
  TIPO_AGENDAMENTO_LABEL,
  type ContagemPorChave,
  type ContagemPorMes,
  type StatusAgendamento,
  type TipoAgendamento,
} from '@/types';

/**
 * Indicadores operacionais da clínica: pacientes, agendamentos e notificações.
 *
 * Dinheiro NÃO aparece aqui de propósito — quem responde por receita é o
 * relatório do financeiro, em regime de caixa. Ter duas telas somando receita
 * de formas diferentes seria pior do que ter uma só.
 */

function contagem(v: number): string {
  return v.toLocaleString('pt-BR');
}

function paraBarras(
  dados: ContagemPorChave[],
  rotular: (chave: string) => string = (c) => c,
): ItemBarra[] {
  return dados
    .map((d) => ({ rotulo: d._id ? rotular(d._id) : 'Não informado', valor: d.total }))
    .sort((a, b) => b.valor - a.valor);
}

function mesesParaBarras(dados: ContagemPorMes[]): ItemBarra[] {
  return dados.map((d) => ({
    rotulo: dayjs(`${d._id.ano}-${String(d._id.mes).padStart(2, '0')}-01`).format('MMM/YY'),
    valor: d.total,
  }));
}

export function IndicadoresPage() {
  const [dataInicio, setDataInicio] = useState(dayjs().subtract(2, 'month').startOf('month').format('YYYY-MM-DD'));
  const [dataFim, setDataFim] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  const filtros: IndicadoresParams = {
    dataInicio: dayjs(dataInicio).startOf('day').toISOString(),
    dataFim: dayjs(dataFim).endOf('day').toISOString(),
  };

  const pacientesQ = useQuery({
    queryKey: ['indicadores', 'pacientes', filtros],
    queryFn: () => indicadoresApi.pacientes(filtros),
    placeholderData: (anterior) => anterior,
  });
  const agendaQ = useQuery({
    queryKey: ['indicadores', 'agendamentos', filtros],
    queryFn: () => indicadoresApi.agendamentos(filtros),
    placeholderData: (anterior) => anterior,
  });
  const notifQ = useQuery({
    queryKey: ['indicadores', 'notificacoes', filtros],
    queryFn: () => indicadoresApi.notificacoes(filtros),
    placeholderData: (anterior) => anterior,
  });

  const carregando = pacientesQ.isLoading || agendaQ.isLoading || notifQ.isLoading;

  const totalAgendamentos = (agendaQ.data?.porStatus ?? []).reduce((s, d) => s + d.total, 0);
  const totalNotificacoes = (notifQ.data?.porStatus ?? []).reduce((s, d) => s + d.total, 0);

  const cards = [
    { label: 'Pacientes ativos', valor: contagem(pacientesQ.data?.totalAtivos ?? 0), icon: Users },
    { label: 'Agendamentos no período', valor: contagem(totalAgendamentos), icon: CalendarCheck },
    { label: 'Notificações no período', valor: contagem(totalNotificacoes), icon: Send },
    { label: 'Taxa de entrega', valor: `${notifQ.data?.taxaEntrega ?? 0}%`, icon: BarChart3 },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Indicadores"
        subtitle="Pacientes, agenda e comunicação — o resultado financeiro fica no relatório do Financeiro"
        extra={
          <Button variant="outline" asChild>
            <Link to="/financeiro/relatorio">
              <BarChart3 className="mr-2 h-4 w-4" /> Relatório financeiro
            </Link>
          </Button>
        }
      />

      {/* Uma linha de filtros para tudo que ela afeta. */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="iInicio">De</Label>
              <Input id="iInicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iFim">Até</Label>
              <Input id="iFim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {carregando
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          : cards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className="text-lg font-bold">{c.valor}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-1">Pacientes novos por mês</h3>
            <p className="text-xs text-muted-foreground mb-4">Cadastros criados dentro do período.</p>
            {carregando ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <BarrasHorizontais
                dados={mesesParaBarras(pacientesQ.data?.novosPorMes ?? [])}
                cor={COR_CONTAGEM}
                formatar={contagem}
                vazio="Nenhum paciente cadastrado no período."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-1">Agendamentos por situação</h3>
            <p className="text-xs text-muted-foreground mb-4">Realizados, cancelados e faltas no período.</p>
            {carregando ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <BarrasHorizontais
                dados={paraBarras(
                  agendaQ.data?.porStatus ?? [],
                  (c) => STATUS_AGENDAMENTO_LABEL[c as StatusAgendamento] ?? c,
                )}
                cor={COR_CONTAGEM}
                formatar={contagem}
                vazio="Nenhum agendamento no período."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-1">Agendamentos por tipo</h3>
            <p className="text-xs text-muted-foreground mb-4">Que tipo de atendimento a agenda mais concentra.</p>
            {carregando ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <BarrasHorizontais
                dados={paraBarras(
                  agendaQ.data?.porTipo ?? [],
                  (c) => TIPO_AGENDAMENTO_LABEL[c as TipoAgendamento] ?? c,
                )}
                cor={COR_CONTAGEM}
                formatar={contagem}
                vazio="Nenhum agendamento no período."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-1">Notificações por canal</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Volume por canal; a taxa de entrega geral está no card acima.
            </p>
            {carregando ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <BarrasHorizontais
                dados={(notifQ.data?.porCanal ?? [])
                  .map((c) => ({
                    rotulo: c._id ?? 'Não informado',
                    valor: c.total,
                    detalhe: `${contagem(c.enviados)} entregue(s)`,
                  }))
                  .sort((a, b) => b.valor - a.valor)}
                cor={COR_CONTAGEM}
                formatar={contagem}
                vazio="Nenhuma notificação no período."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
