import React, { useMemo, useState } from 'react';
import { useClones, useProducoes, usePerdas, useLotes } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getMonthOptions(items) {
  const months = new Set();
  items.forEach(i => { if (i.data) months.add(i.data.substring(0, 7)); });
  return Array.from(months).sort().reverse();
}

function calcEnraizamento(producao, perdas) {
  if (!producao || producao === 0) return null;
  return (((producao - perdas) / producao) * 100).toFixed(1);
}

function calcPerda(producao, perdas) {
  if (!producao || producao === 0) return null;
  return ((perdas / producao) * 100).toFixed(1);
}

function calcEficiencia(producao, perdas) {
  return calcEnraizamento(producao, perdas);
}

function RateBadge({ pct, inverso = false }) {
  if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
  const v = parseFloat(pct);
  let color;
  if (inverso) {
    color = v <= 5 ? 'bg-green-100 text-green-700' : v <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  } else {
    color = v >= 80 ? 'bg-green-100 text-green-700' : v >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{pct}%</span>;
}

export default function Porcentagem() {
  const { data: clones } = useClones();
  const { data: producoes } = useProducoes();
  const { data: perdas } = usePerdas();
  const { data: lotes } = useLotes();

  const [mesFiltro, setMesFiltro] = useState('todos');
  const [cloneFiltro, setCloneFiltro] = useState('todos');
  const [loteFiltro, setLoteFiltro] = useState('todos');

  const allItems = useMemo(() => [...producoes, ...perdas], [producoes, perdas]);
  const monthOptions = useMemo(() => getMonthOptions(allItems), [allItems]);

  const applyFilters = (items) => items.filter(i => {
    if (mesFiltro !== 'todos' && !(i.data && i.data.startsWith(mesFiltro))) return false;
    if (cloneFiltro !== 'todos' && i.clone_id !== cloneFiltro) return false;
    if (loteFiltro !== 'todos' && i.lote_id !== loteFiltro) return false;
    return true;
  });

  const producoesFiltradas = useMemo(() => applyFilters(producoes), [producoes, mesFiltro, cloneFiltro, loteFiltro]);
  const perdasFiltradas = useMemo(() => applyFilters(perdas), [perdas, mesFiltro, cloneFiltro, loteFiltro]);

  const cloneMap = useMemo(() => Object.fromEntries(clones.map(c => [c.id, c])), [clones]);
  const loteMap = useMemo(() => Object.fromEntries(lotes.map(l => [l.id, l])), [lotes]);

  const dadosPorClone = useMemo(() => {
    const acc = {};
    producoesFiltradas.forEach(p => {
      if (!acc[p.clone_id]) acc[p.clone_id] = { producao: 0, perdas: 0 };
      acc[p.clone_id].producao += (p.quantidade || 0);
    });
    perdasFiltradas.forEach(p => {
      if (!acc[p.clone_id]) acc[p.clone_id] = { producao: 0, perdas: 0 };
      acc[p.clone_id].perdas += (p.quantidade || 0);
    });
    return Object.entries(acc).filter(([, v]) => v.producao > 0).map(([cloneId, v]) => ({
      clone: cloneMap[cloneId],
      producao: v.producao, perdas: v.perdas,
      enraizadas: v.producao - v.perdas,
      pctEnraizamento: calcEnraizamento(v.producao, v.perdas),
      pctPerdas: calcPerda(v.producao, v.perdas),
      pctEficiencia: calcEficiencia(v.producao, v.perdas),
    })).sort((a, b) => parseFloat(b.pctEnraizamento) - parseFloat(a.pctEnraizamento));
  }, [producoesFiltradas, perdasFiltradas, cloneMap]);

  const dadosPorLote = useMemo(() => {
    const acc = {};
    producoesFiltradas.forEach(p => {
      if (!acc[p.lote_id]) acc[p.lote_id] = { producao: 0, perdas: 0 };
      acc[p.lote_id].producao += (p.quantidade || 0);
    });
    perdasFiltradas.forEach(p => {
      if (!acc[p.lote_id]) acc[p.lote_id] = { producao: 0, perdas: 0 };
      acc[p.lote_id].perdas += (p.quantidade || 0);
    });
    return Object.entries(acc).filter(([, v]) => v.producao > 0).map(([loteId, v]) => ({
      lote: loteMap[loteId],
      producao: v.producao, perdas: v.perdas,
      enraizadas: v.producao - v.perdas,
      pctEnraizamento: calcEnraizamento(v.producao, v.perdas),
      pctPerdas: calcPerda(v.producao, v.perdas),
      pctEficiencia: calcEficiencia(v.producao, v.perdas),
    })).sort((a, b) => parseFloat(b.pctEnraizamento) - parseFloat(a.pctEnraizamento));
  }, [producoesFiltradas, perdasFiltradas, loteMap]);

  // Totais globais
  const totalProd = producoesFiltradas.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalPerd = perdasFiltradas.reduce((s, p) => s + (p.quantidade || 0), 0);
  const globalEnraizamento = calcEnraizamento(totalProd, totalPerd);
  const globalPerdas = calcPerda(totalProd, totalPerd);
  const globalEficiencia = calcEficiencia(totalProd, totalPerd);

  return (
    <div>
      <PageHeader title="Análise de Desempenho" description="Enraizamento, perdas e eficiência por clone e lote" />

      {/* KPIs globais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Enraizamento Global</p>
          <p className="text-3xl font-bold text-primary">{globalEnraizamento ?? '—'}%</p>
          <p className="text-xs text-muted-foreground mt-1">{(totalProd - totalPerd).toLocaleString('pt-BR')} enraizadas de {totalProd.toLocaleString('pt-BR')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Taxa de Perdas</p>
          <p className={`text-3xl font-bold ${parseFloat(globalPerdas) > 10 ? 'text-destructive' : parseFloat(globalPerdas) > 5 ? 'text-amber-600' : 'text-green-600'}`}>
            {globalPerdas ?? '—'}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">{totalPerd.toLocaleString('pt-BR')} mudas perdidas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Eficiência</p>
          <p className={`text-3xl font-bold ${parseFloat(globalEficiencia) >= 90 ? 'text-green-600' : parseFloat(globalEficiencia) >= 80 ? 'text-amber-600' : 'text-destructive'}`}>
            {globalEficiencia ?? '—'}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">(Produção - Perdas) / Produção</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={mesFiltro} onValueChange={setMesFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {monthOptions.map(m => (
              <SelectItem key={m} value={m}>{format(new Date(m + '-01T12:00:00'), 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cloneFiltro} onValueChange={setCloneFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por clone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clones</SelectItem>
            {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={loteFiltro} onValueChange={setLoteFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por lote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os lotes</SelectItem>
            {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
          </SelectContent>
        </Select>

      </div>

      {/* Tabela por Clone */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Por Clone</h2>
      <Card className="overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clone</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produção</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perdas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizadas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizamento %</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa de Perdas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eficiência</th>
              </tr>
            </thead>
            <tbody>
              {dadosPorClone.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Sem dados para o período selecionado</td></tr>
              ) : dadosPorClone.map((row, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.clone?.codigo_clone || '—'}</td>
                  <td className="px-4 py-3 text-right">{row.producao.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right text-destructive">{row.perdas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right">{row.enraizadas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-center"><RateBadge pct={row.pctEnraizamento} /></td>
                  <td className="px-4 py-3 text-center"><RateBadge pct={row.pctPerdas} inverso /></td>
                  <td className="px-4 py-3 text-center"><RateBadge pct={row.pctEficiencia} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabela por Lote */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Por Lote</h2>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lote</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produção</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perdas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizadas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizamento %</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa de Perdas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eficiência</th>
              </tr>
            </thead>
            <tbody>
              {dadosPorLote.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Sem dados para o período selecionado</td></tr>
              ) : dadosPorLote.map((row, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.lote?.codigo || '—'}</td>
                  <td className="px-4 py-3 text-right">{row.producao.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right text-destructive">{row.perdas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right">{row.enraizadas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-center"><RateBadge pct={row.pctEnraizamento} /></td>
                  <td className="px-4 py-3 text-center"><RateBadge pct={row.pctPerdas} inverso /></td>
                  <td className="px-4 py-3 text-center"><RateBadge pct={row.pctEficiencia} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}