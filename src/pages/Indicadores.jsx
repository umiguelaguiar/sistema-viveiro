import React, { useMemo, useState } from 'react';
import { useLotes, useEspecies } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function calcTaxa(numerador, denominador) {
  if (!denominador || denominador === 0) return 0;
  return parseFloat(((numerador / denominador) * 100).toFixed(1));
}

function classificar(valor, thresholds) {
  if (valor >= thresholds[1]) return 'Ótimo';
  if (valor >= thresholds[0]) return 'Médio';
  return 'Ruim';
}

const STATUS_COLORS = {
  Ótimo: { card: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', text: 'text-green-700' },
  Médio: { card: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700' },
  Ruim: { card: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', text: 'text-red-700' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Ruim;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>{status}</span>;
}

function avg(arr) {
  if (!arr.length) return 0;
  return parseFloat((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1));
}

export default function Indicadores() {
  const { data: lotes = [] } = useLotes();
  const { data: especies = [] } = useEspecies();

  const [especieFiltro, setEspecieFiltro] = useState('todos');
  const [anoFiltro, setAnoFiltro] = useState('todos');

  const especieMap = useMemo(() => Object.fromEntries(especies.map(e => [e.id, e])), [especies]);

  const anoOptions = useMemo(() => {
    const anos = new Set(lotes.filter(l => l.data_inicio).map(l => l.data_inicio.substring(0, 4)));
    return Array.from(anos).sort().reverse();
  }, [lotes]);

  const lotesFiltrados = useMemo(() => lotes.filter(l => {
    if (especieFiltro !== 'todos' && l.especie_id !== especieFiltro) return false;
    if (anoFiltro !== 'todos' && !(l.data_inicio && l.data_inicio.startsWith(anoFiltro))) return false;
    return true;
  }), [lotes, especieFiltro, anoFiltro]);

  const indicadores = useMemo(() => lotesFiltrados
    .filter(l => (l.total_estacas > 0) || (l.estacas_enraizadas > 0) || (l.mudas_sobreviventes > 0))
    .map(l => {
      const base = l.total_estacas || l.estacas_enraizadas || 1;
      const taxa_enraizamento = calcTaxa(l.estacas_enraizadas, l.total_estacas || l.estacas_enraizadas || 1);
      const taxa_sobrevivencia = calcTaxa(l.mudas_sobreviventes, l.estacas_enraizadas || l.mudas_sobreviventes || 1);
      const taxa_aproveitamento = calcTaxa(l.mudas_vendaveis, l.total_estacas || l.estacas_enraizadas || 1);
      const taxa_mortalidade = l.total_estacas > 0
        ? calcTaxa(l.total_estacas - (l.mudas_vendaveis || 0), l.total_estacas)
        : 0;
      return {
        ...l,
        taxa_enraizamento,
        taxa_sobrevivencia,
        taxa_aproveitamento,
        taxa_mortalidade,
        status_enraizamento: classificar(taxa_enraizamento, [60, 80]),
        status_sobrevivencia: classificar(taxa_sobrevivencia, [85, 92]),
        status_aproveitamento: classificar(taxa_aproveitamento, [70, 85]),
        especie: especieMap[l.especie_id],
      };
    }), [lotesFiltrados, especieMap]);

  const mediaEnraizamento = avg(indicadores.map(i => i.taxa_enraizamento));
  const mediaSobrevivencia = avg(indicadores.map(i => i.taxa_sobrevivencia));
  const mediaAproveitamento = avg(indicadores.map(i => i.taxa_aproveitamento));
  const mediaMortalidade = avg(indicadores.map(i => i.taxa_mortalidade));

  const KpiCard = ({ label, valor, thresholds, inverso = false }) => {
    const status = inverso
      ? (valor <= 15 ? 'Ótimo' : valor <= 30 ? 'Médio' : 'Ruim')
      : classificar(valor, thresholds);
    const c = STATUS_COLORS[status];
    return (
      <Card className={`p-5 border ${c.card}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
        <p className={`text-4xl font-bold ${c.text}`}>{valor}%</p>
        <div className="mt-2"><StatusBadge status={status} /></div>
        <p className="text-xs text-muted-foreground mt-1">{indicadores.length} lotes analisados</p>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Indicadores de Produção" description="Análise de enraizamento, sobrevivência e aproveitamento por lote" />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={especieFiltro} onValueChange={setEspecieFiltro}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por espécie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as espécies</SelectItem>
            {especies.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={anoFiltro} onValueChange={setAnoFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os anos</SelectItem>
            {anoOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs médios */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Média Enraizamento" valor={mediaEnraizamento} thresholds={[60, 80]} />
        <KpiCard label="Média Sobrevivência" valor={mediaSobrevivencia} thresholds={[85, 92]} />
        <KpiCard label="Média Aproveitamento" valor={mediaAproveitamento} thresholds={[70, 85]} />
        <KpiCard label="Média Mortalidade" valor={mediaMortalidade} inverso />
      </div>

      {/* Tabela por lote */}
      {indicadores.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Nenhum lote com dados de produção encontrado. Preencha os campos de indicadores nos lotes.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lote</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Espécie</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Início</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estacas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizamento</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sobrevivência</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aproveitamento</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mortalidade</th>
                </tr>
              </thead>
              <tbody>
                {indicadores.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold">{row.codigo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.especie?.nome || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.data_inicio ? format(new Date(row.data_inicio + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">{(row.total_estacas || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${STATUS_COLORS[row.status_enraizamento].text}`}>{row.taxa_enraizamento}%</span>
                        <StatusBadge status={row.status_enraizamento} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${STATUS_COLORS[row.status_sobrevivencia].text}`}>{row.taxa_sobrevivencia}%</span>
                        <StatusBadge status={row.status_sobrevivencia} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${STATUS_COLORS[row.status_aproveitamento].text}`}>{row.taxa_aproveitamento}%</span>
                        <StatusBadge status={row.status_aproveitamento} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${row.taxa_mortalidade > 30 ? 'text-red-600' : row.taxa_mortalidade > 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {row.taxa_mortalidade}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}