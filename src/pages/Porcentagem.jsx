import React, { useMemo, useState } from 'react';
import { useClones, useProducoes, usePerdas, useLotes } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

function getMonthOptions(items) {
  const months = new Set();
  items.forEach(i => { if (i.data) months.add(i.data.substring(0, 7)); });
  return Array.from(months).sort().reverse();
}

function calcEnraizamento(producao, perdas) {
  if (!producao || producao === 0) return null;
  const enraizadas = producao - perdas;
  return ((enraizadas / producao) * 100).toFixed(1);
}

function EnraizamentoBadge({ pct }) {
  if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
  const v = parseFloat(pct);
  const color = v >= 80 ? 'bg-green-100 text-green-700' : v >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{pct}%</span>;
}

export default function Porcentagem() {
  const { data: clones } = useClones();
  const { data: producoes } = useProducoes();
  const { data: perdas } = usePerdas();
  const { data: lotes } = useLotes();

  const [mesFiltro, setMesFiltro] = useState('todos');
  const [viewMode, setViewMode] = useState('clone'); // 'clone' | 'lote'

  const allItems = useMemo(() => [...producoes, ...perdas], [producoes, perdas]);
  const monthOptions = useMemo(() => getMonthOptions(allItems), [allItems]);

  const filterByMonth = (items) => {
    if (mesFiltro === 'todos') return items;
    return items.filter(i => i.data && i.data.startsWith(mesFiltro));
  };

  const producoesFiltradas = useMemo(() => filterByMonth(producoes), [producoes, mesFiltro]);
  const perdasFiltradas = useMemo(() => filterByMonth(perdas), [perdas, mesFiltro]);

  const cloneMap = useMemo(() => {
    const m = {};
    clones.forEach(c => { m[c.id] = c; });
    return m;
  }, [clones]);

  const loteMap = useMemo(() => {
    const m = {};
    lotes.forEach(l => { m[l.id] = l; });
    return m;
  }, [lotes]);

  // Por clone
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
    return Object.entries(acc)
      .filter(([, v]) => v.producao > 0)
      .map(([cloneId, v]) => ({
        clone: cloneMap[cloneId],
        producao: v.producao,
        perdas: v.perdas,
        enraizadas: v.producao - v.perdas,
        pct: calcEnraizamento(v.producao, v.perdas),
      }))
      .sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct));
  }, [producoesFiltradas, perdasFiltradas, cloneMap]);

  // Por lote
  const dadosPorLote = useMemo(() => {
    const acc = {};
    producoesFiltradas.forEach(p => {
      const key = p.lote_id;
      if (!acc[key]) acc[key] = { clone_id: p.clone_id, producao: 0, perdas: 0 };
      acc[key].producao += (p.quantidade || 0);
    });
    perdasFiltradas.forEach(p => {
      const key = p.lote_id;
      if (!acc[key]) acc[key] = { clone_id: p.clone_id, producao: 0, perdas: 0 };
      acc[key].perdas += (p.quantidade || 0);
    });
    return Object.entries(acc)
      .filter(([, v]) => v.producao > 0)
      .map(([loteId, v]) => ({
        lote: loteMap[loteId],
        producao: v.producao,
        perdas: v.perdas,
        enraizadas: v.producao - v.perdas,
        pct: calcEnraizamento(v.producao, v.perdas),
      }))
      .sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct));
  }, [producoesFiltradas, perdasFiltradas, loteMap]);

  return (
    <div>
      <PageHeader title="Porcentagem de Enraizamento" description="Taxa de enraizamento (%) por clone e lote" />

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={mesFiltro} onValueChange={setMesFiltro}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {monthOptions.map(m => (
              <SelectItem key={m} value={m}>
                {format(new Date(m + '-01'), 'MMMM yyyy').replace(/^\w/, c => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setViewMode('clone')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'clone' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Por Clone
          </button>
          <button
            onClick={() => setViewMode('lote')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'lote' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Por Lote
          </button>
        </div>
      </div>

      {viewMode === 'clone' ? (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clone</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produção</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perdas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizadas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizamento %</th>
              </tr>
            </thead>
            <tbody>
              {dadosPorClone.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Sem dados para o período selecionado</td></tr>
              ) : dadosPorClone.map((row, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.clone?.codigo_clone || '—'}</td>
                  <td className="px-4 py-3 text-right">{row.producao.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right text-destructive">{row.perdas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right">{row.enraizadas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right"><EnraizamentoBadge pct={row.pct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lote</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produção</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perdas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizadas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizamento %</th>
              </tr>
            </thead>
            <tbody>
              {dadosPorLote.map((row, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.lote?.codigo || '—'}</td>
                  <td className="px-4 py-3 text-right">{row.producao.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right text-destructive">{row.perdas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right">{row.enraizadas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right"><EnraizamentoBadge pct={row.pct} /></td>
                </tr>
              ))}
              {dadosPorLote.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Sem dados para o período selecionado</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}