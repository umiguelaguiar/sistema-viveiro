import React, { useMemo, useState } from 'react';
import { useClones, useProducoes, usePerdas, useMovimentacoes, useSetores, useLotes } from '@/hooks/useNurseryData';
import { calculateStock, getStockBySetor, getStockByClone, getTotalProducaoByClone, getTotalPerdasByClone, getMortalityRate } from '@/lib/stockCalculations';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Factory, TreePine, Skull, Package } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(36, 80%, 50%)', 'hsl(200, 60%, 45%)', 'hsl(280, 50%, 55%)', 'hsl(0, 72%, 51%)'];

function getMonthOptions(items) {
  const months = new Set();
  items.forEach(i => { if (i.data) months.add(i.data.substring(0, 7)); });
  return Array.from(months).sort().reverse();
}

export default function Dashboard() {
  const { data: clones } = useClones();
  const { data: producoes } = useProducoes();
  const { data: perdas } = usePerdas();
  const { data: movimentacoes } = useMovimentacoes();
  const { data: setores } = useSetores();
  const { data: lotes } = useLotes();

  const [mesFiltro, setMesFiltro] = useState('todos');
  const [cloneFiltro, setCloneFiltro] = useState('todos');
  const [loteFiltro, setLoteFiltro] = useState('todos');

  const allItems = useMemo(() => [...producoes, ...perdas, ...movimentacoes], [producoes, perdas, movimentacoes]);
  const monthOptions = useMemo(() => getMonthOptions(allItems), [allItems]);

  // Lotes filtrados pelo clone selecionado
  const lotesFiltradosPorClone = useMemo(() =>
    cloneFiltro === 'todos' ? lotes : lotes.filter(l => l.clone_id === cloneFiltro),
  [lotes, cloneFiltro]);

  const applyFilters = (items) => {
    let filtered = items;
    if (mesFiltro !== 'todos') filtered = filtered.filter(i => i.data && i.data.startsWith(mesFiltro));
    if (cloneFiltro !== 'todos') filtered = filtered.filter(i => i.clone_id === cloneFiltro);
    if (loteFiltro !== 'todos') filtered = filtered.filter(i => i.lote_id === loteFiltro);
    return filtered;
  };

  const producoesFiltradas = useMemo(() => applyFilters(producoes), [producoes, mesFiltro, cloneFiltro, loteFiltro]);
  const perdasFiltradas = useMemo(() => applyFilters(perdas), [perdas, mesFiltro, cloneFiltro, loteFiltro]);
  const movimentacoesFiltradas = useMemo(() => applyFilters(movimentacoes), [movimentacoes, mesFiltro, cloneFiltro, loteFiltro]);

  // Stock calculado com filtros de clone/lote mas acumulado (sem filtro de mês)
  const producoesPStock = useMemo(() => {
    let f = producoes;
    if (cloneFiltro !== 'todos') f = f.filter(i => i.clone_id === cloneFiltro);
    if (loteFiltro !== 'todos') f = f.filter(i => i.lote_id === loteFiltro);
    return f;
  }, [producoes, cloneFiltro, loteFiltro]);

  const movimentacoesPStock = useMemo(() => {
    let f = movimentacoes;
    if (cloneFiltro !== 'todos') f = f.filter(i => i.clone_id === cloneFiltro);
    if (loteFiltro !== 'todos') f = f.filter(i => i.lote_id === loteFiltro);
    return f;
  }, [movimentacoes, cloneFiltro, loteFiltro]);

  const perdasPStock = useMemo(() => {
    let f = perdas;
    if (cloneFiltro !== 'todos') f = f.filter(i => i.clone_id === cloneFiltro);
    if (loteFiltro !== 'todos') f = f.filter(i => i.lote_id === loteFiltro);
    return f;
  }, [perdas, cloneFiltro, loteFiltro]);

  const stock = useMemo(() => calculateStock(producoesPStock, movimentacoesPStock, perdasPStock), [producoesPStock, movimentacoesPStock, perdasPStock]);
  const stockBySetor = useMemo(() => getStockBySetor(stock, setores), [stock, setores]);
  const stockByClone = useMemo(() => getStockByClone(stock, clones), [stock, clones]);

  const producaoByClone = useMemo(() => getTotalProducaoByClone(producoesFiltradas, clones), [producoesFiltradas, clones]);
  const perdasByClone = useMemo(() => getTotalPerdasByClone(perdasFiltradas, clones), [perdasFiltradas, clones]);

  const totalEstoque = stockBySetor.reduce((s, v) => s + v.total, 0);
  const totalProducao = producoesFiltradas.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalPerdas = perdasFiltradas.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalExpedicao = movimentacoesFiltradas.filter(m => m.tipo === 'expedicao').reduce((s, m) => s + (m.quantidade || 0), 0);

  const setorChartData = stockBySetor.filter(s => s.total > 0).map(s => ({ name: s.setor.nome, value: s.total }));

  const mortalidadeData = clones
    .filter(c => cloneFiltro === 'todos' || c.id === cloneFiltro)
    .map(c => {
      const prod = producaoByClone[c.id] || 0;
      const perd = perdasByClone[c.id] || 0;
      return { name: c.codigo_clone, taxa: parseFloat(getMortalityRate(prod, perd).toFixed(1)), perdas: perd, producao: prod };
    }).filter(d => d.producao > 0).sort((a, b) => b.taxa - a.taxa);

  const estoqueCloneData = stockByClone
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(s => ({ name: s.clone.codigo_clone, estoque: s.total }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do viveiro de mudas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={mesFiltro} onValueChange={setMesFiltro}>
            <SelectTrigger className="w-44">
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

          <Select value={cloneFiltro} onValueChange={v => { setCloneFiltro(v); setLoteFiltro('todos'); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filtrar por clone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clones</SelectItem>
              {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={loteFiltro} onValueChange={setLoteFiltro}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filtrar por lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os lotes</SelectItem>
              {lotesFiltradosPorClone.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Estoque Total" value={totalEstoque.toLocaleString('pt-BR')} icon={Package} />
        <StatCard title="Produção" value={totalProducao.toLocaleString('pt-BR')} icon={Factory} />
        <StatCard title="Perdas" value={totalPerdas.toLocaleString('pt-BR')} icon={Skull} />
        <StatCard title="Expedido" value={totalExpedicao.toLocaleString('pt-BR')} icon={TreePine} />
      </div>

      {/* Estoque por Setor - cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stockBySetor.map(({ setor, total }) => (
          <Card key={setor.id} className="p-4 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{setor.nome}</span>
            <span className="text-2xl font-bold text-foreground">{total.toLocaleString('pt-BR')}</span>
            <span className="text-xs text-muted-foreground">mudas em estoque</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Estoque por Setor - pie */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Estoque por Setor</h3>
          {setorChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={setorChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {setorChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de estoque</div>
          )}
        </Card>

        {/* Estoque por Clone */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Top 10 Clones por Estoque</h3>
          {estoqueCloneData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={estoqueCloneData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 12%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="estoque" fill="hsl(152, 55%, 28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </Card>
      </div>

      {/* Mortalidade por Clone */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Taxa de Mortalidade por Clone (%)</h3>
        {mortalidadeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mortalidadeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 12%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(val) => `${val}%`} />
              <Bar dataKey="taxa" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de mortalidade</div>
        )}
      </Card>
    </div>
  );
}