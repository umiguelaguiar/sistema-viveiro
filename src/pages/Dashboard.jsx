import React, { useMemo, useState } from 'react';
import { useClones, useProducoes, usePerdas, useMovimentacoes, useSetores, useLotes } from '@/hooks/useNurseryData';
import { calculateStock, getStockBySetor, getStockByClone, getTotalProducaoByClone, getTotalPerdasByClone, getMortalityRate } from '@/lib/stockCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  Factory, TreePine, Skull, Package, TrendingUp, AlertTriangle,
  CheckCircle, Plus, Truck, ArrowRightLeft, Activity
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(36, 80%, 50%)', 'hsl(200, 60%, 45%)', 'hsl(280, 50%, 55%)', 'hsl(0, 72%, 51%)'];

function getMonthOptions(items) {
  const months = new Set();
  // Sempre inclui os últimos 12 meses
  const hoje = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  // Também inclui quaisquer meses mais antigos que tenham dados
  items.forEach(i => { if (i.data) months.add(i.data.substring(0, 7)); });
  return Array.from(months).sort().reverse();
}

function KpiCard({ title, value, icon: Icon, color = 'text-foreground', bg = 'bg-card', sub }) {
  return (
    <Card className={`${bg}`}>
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
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

  const applyFilters = (items) => {
    let filtered = items;
    if (mesFiltro !== 'todos') filtered = filtered.filter(i => i.data && i.data.startsWith(mesFiltro));
    if (cloneFiltro !== 'todos') filtered = filtered.filter(i => i.clone_id === cloneFiltro);
    if (loteFiltro !== 'todos') filtered = filtered.filter(i => i.lote_id === loteFiltro);
    return filtered;
  };

  const producoesFiltradas = useMemo(() => applyFilters(producoes), [producoes, mesFiltro, cloneFiltro, loteFiltro]);
  const perdasFiltradas = useMemo(() => applyFilters(perdas), [perdas, mesFiltro, cloneFiltro, loteFiltro]);
  const movFiltradas = useMemo(() => applyFilters(movimentacoes), [movimentacoes, mesFiltro, cloneFiltro, loteFiltro]);

  const producoesPStock = useMemo(() => {
    let f = producoes;
    if (cloneFiltro !== 'todos') f = f.filter(i => i.clone_id === cloneFiltro);
    if (loteFiltro !== 'todos') f = f.filter(i => i.lote_id === loteFiltro);
    return f;
  }, [producoes, cloneFiltro, loteFiltro]);

  const movPStock = useMemo(() => {
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

  const stock = useMemo(() => calculateStock(producoesPStock, movPStock, perdasPStock), [producoesPStock, movPStock, perdasPStock]);
  const stockBySetor = useMemo(() => getStockBySetor(stock, setores), [stock, setores]);
  const stockByClone = useMemo(() => getStockByClone(stock, clones), [stock, clones]);

  const producaoByClone = useMemo(() => getTotalProducaoByClone(producoesFiltradas, clones), [producoesFiltradas, clones]);
  const perdasByClone = useMemo(() => getTotalPerdasByClone(perdasFiltradas, clones), [perdasFiltradas, clones]);

  const totalEstoque = stockBySetor.reduce((s, v) => s + v.total, 0);
  const totalProducao = producoesFiltradas.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalPerdas = perdasFiltradas.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalExpedicao = movFiltradas.filter(m => m.tipo === 'expedicao').reduce((s, m) => s + (m.quantidade || 0), 0);

  const eficiencia = totalProducao > 0 ? (((totalProducao - totalPerdas) / totalProducao) * 100).toFixed(1) : '0.0';
  const mortalidade = totalProducao > 0 ? ((totalPerdas / totalProducao) * 100).toFixed(1) : '0.0';

  // Conferência automática — só faz sentido sem filtro de mês, pois estoque é acumulado
  const conferenciaSemFiltro = mesFiltro === 'todos';
  const totalProducaoGeral = producoesPStock.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalPerdasGeral = perdasPStock.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalExpedicaoGeral = movPStock.filter(m => m.tipo === 'expedicao').reduce((s, m) => s + (m.quantidade || 0), 0);
  const diferenca = totalProducaoGeral - totalPerdasGeral - totalExpedicaoGeral - totalEstoque;
  const conferenciOk = Math.abs(diferenca) < 1;

  // Alertas
  const setorSombra = setores.find(s => s.nome?.toLowerCase().includes('sombra'));
  const stockSombra = setorSombra ? (stockBySetor.find(s => s.setor.id === setorSombra.id)?.total || 0) : -1;
  const alertas = [];
  if (setorSombra && stockSombra === 0) alertas.push({ tipo: 'danger', msg: '🚨 Sem mudas na Casa de Sombra' });
  if (parseFloat(mortalidade) > 8) alertas.push({ tipo: 'warning', msg: `⚠️ Alta mortalidade: ${mortalidade}%` });
  if (conferenciaSemFiltro && !conferenciOk) alertas.push({ tipo: 'warning', msg: `⚠️ Conferência: diferença de ${diferenca.toLocaleString('pt-BR')} mudas` });

  // Gráfico evolução 6 meses
  const evolucao = useMemo(() => {
    const base = mesFiltro !== 'todos' ? new Date(mesFiltro + '-15') : new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(base, 5 - i);
      const label = format(d, 'MMM/yy', { locale: ptBR });
      const iv = { start: startOfMonth(d), end: endOfMonth(d) };
      const inIv = (dt) => { try { return isWithinInterval(parseISO(dt), iv); } catch { return false; } };
      const filterFn = (arr) => {
        let f = arr.filter(i => inIv(i.data));
        if (cloneFiltro !== 'todos') f = f.filter(i => i.clone_id === cloneFiltro);
        if (loteFiltro !== 'todos') f = f.filter(i => i.lote_id === loteFiltro);
        return f;
      };
      const prod = filterFn(producoes).reduce((s, p) => s + (p.quantidade || 0), 0);
      const perd = filterFn(perdas).reduce((s, p) => s + (p.quantidade || 0), 0);
      const exped = filterFn(movimentacoes).filter(m => m.tipo === 'expedicao').reduce((s, m) => s + (m.quantidade || 0), 0);
      return { label, prod, perd, exped };
    });
  }, [mesFiltro, cloneFiltro, loteFiltro, producoes, perdas, movimentacoes]);

  const setorChartData = stockBySetor.filter(s => s.total > 0).map(s => ({ name: s.setor.nome, value: s.total }));
  const mortalidadeData = clones
    .filter(c => cloneFiltro === 'todos' || c.id === cloneFiltro)
    .map(c => {
      const prod = producaoByClone[c.id] || 0;
      const perd = perdasByClone[c.id] || 0;
      return { name: c.codigo_clone, taxa: parseFloat(getMortalityRate(prod, perd).toFixed(1)), perdas: perd, producao: prod };
    }).filter(d => d.producao > 0).sort((a, b) => b.taxa - a.taxa);

  const estoqueCloneData = stockByClone.filter(s => s.total > 0).sort((a, b) => b.total - a.total).slice(0, 10)
    .map(s => ({ name: s.clone.codigo_clone, estoque: s.total }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do viveiro de mudas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={mesFiltro} onValueChange={setMesFiltro}>
            <SelectTrigger className="w-40 sm:w-44"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {monthOptions.map(m => {
                const [y, mo] = m.split('-').map(Number);
                return <SelectItem key={m} value={m}>{format(new Date(y, mo - 1, 1), 'MMM yyyy', { locale: ptBR })}</SelectItem>;
              })}
              ))}
            </SelectContent>
          </Select>
          <Select value={cloneFiltro} onValueChange={setCloneFiltro}>
            <SelectTrigger className="w-40 sm:w-44"><SelectValue placeholder="Clone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clones</SelectItem>
              {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={loteFiltro} onValueChange={setLoteFiltro}>
            <SelectTrigger className="w-40 sm:w-44"><SelectValue placeholder="Lote" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os lotes</SelectItem>
              {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${a.tipo === 'danger' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Conferência */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${conferenciOk ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
        {conferenciOk ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {!conferenciaSemFiltro
          ? 'ℹ️ Conferência disponível apenas sem filtro de mês (estoque é acumulado)'
          : conferenciOk
          ? '✅ Conferência automática: estoque balanceado'
          : `⚠️ Conferência: Diferença de ${Math.abs(diferenca).toLocaleString('pt-BR')} mudas (Produção - Perdas - Expedição - Estoque ≠ 0)`}
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard title="Estoque Total" value={totalEstoque.toLocaleString('pt-BR')} icon={Package} color="text-primary" />
        <KpiCard title="Produção" value={totalProducao.toLocaleString('pt-BR')} icon={Factory} color="text-primary" />
        <KpiCard title="Perdas" value={totalPerdas.toLocaleString('pt-BR')} icon={Skull} color="text-destructive" />
        <KpiCard title="Expedido" value={totalExpedicao.toLocaleString('pt-BR')} icon={Truck} color="text-blue-600" />
      </div>

      {/* Estoque por Setor */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Estoque por Setor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {setores.map(s => {
            const estoqueSetor = stockBySetor.find(x => x.setor.id === s.id)?.total || 0;
            return (
              <Card key={s.id} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.nome}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{estoqueSetor.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground mt-1">mudas em estoque</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* KPIs eficiência */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
        <KpiCard title="Eficiência" value={`${eficiencia}%`} icon={TrendingUp}
          color={parseFloat(eficiencia) >= 90 ? 'text-green-600' : parseFloat(eficiencia) >= 80 ? 'text-amber-600' : 'text-destructive'}
          sub="(Produção - Perdas) / Produção" />
        <KpiCard title="Mortalidade" value={`${mortalidade}%`} icon={Activity}
          color={parseFloat(mortalidade) > 8 ? 'text-destructive' : parseFloat(mortalidade) > 5 ? 'text-amber-600' : 'text-green-600'}
          sub="Perdas / Produção" />
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="gap-2"><Link to="/producao"><Plus className="w-4 h-4" />Nova Produção</Link></Button>
          <Button asChild size="sm" variant="outline" className="gap-2"><Link to="/perdas"><Skull className="w-4 h-4" />Nova Perda</Link></Button>
          <Button asChild size="sm" variant="outline" className="gap-2"><Link to="/transferencia"><ArrowRightLeft className="w-4 h-4" />Transferência</Link></Button>
          <Button asChild size="sm" variant="outline" className="gap-2"><Link to="/expedicao"><Truck className="w-4 h-4" />Expedição</Link></Button>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Evolução — Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,12%,88%)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="prod" name="Produção" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="perd" name="Perdas" stroke={COLORS[4]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="exped" name="Expedição" stroke={COLORS[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Estoque por Setor</h3>
          {setorChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={setorChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {setorChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Top Clones — Estoque</h3>
          {estoqueCloneData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={estoqueCloneData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,12%,88%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="estoque" name="Estoque" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Mortalidade por Clone (%)</h3>
          {mortalidadeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mortalidadeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,12%,88%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="taxa" name="Mortalidade" fill={COLORS[4]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </Card>
      </div>

      {/* Previsão simples */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3 text-foreground">🔮 Previsão (Média Móvel)</h3>
        {(() => {
          // Média por dias distintos com registro de produção
          const diasDistintos = new Set(producoesPStock.filter(p => p.data).map(p => p.data.substring(0, 10))).size;
          const mediaDiaria = diasDistintos > 0 ? (producoesPStock.reduce((s, p) => s + (p.quantidade || 0), 0)) / diasDistintos : 0;
          const setorRust = setores.find(s => s.nome?.toLowerCase().includes('rustif'));
          const estoqueRust = setorRust ? (stockBySetor.find(s => s.setor.id === setorRust.id)?.total || 0) : 0;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Previsão Semanal</p>
                <p className="text-xl font-bold text-primary">{Math.round(mediaDiaria * 7).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">mudas / 7 dias</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Previsão Mensal</p>
                <p className="text-xl font-bold text-primary">{Math.round(mediaDiaria * 30).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">mudas / 30 dias</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Pronto p/ Expedição</p>
                <p className="text-xl font-bold text-amber-600">{estoqueRust.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">em Rustificação</p>
              </div>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}