import React, { useMemo } from 'react';
import { useClones, useProducoes, usePerdas, useMovimentacoes, useSetores, useLotes } from '@/hooks/useNurseryData';
import { calculateStock, getStockBySetor, getStockByClone, getTotalProducaoByClone, getTotalPerdasByClone, getMortalityRate } from '@/lib/stockCalculations';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Factory, TreePine, Skull, Package } from 'lucide-react';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(36, 80%, 50%)', 'hsl(200, 60%, 45%)', 'hsl(280, 50%, 55%)', 'hsl(0, 72%, 51%)'];

export default function Dashboard() {
  const { data: clones } = useClones();
  const { data: producoes } = useProducoes();
  const { data: perdas } = usePerdas();
  const { data: movimentacoes } = useMovimentacoes();
  const { data: setores } = useSetores();
  const { data: lotes } = useLotes();

  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);
  const stockBySetor = useMemo(() => getStockBySetor(stock, setores), [stock, setores]);
  const stockByClone = useMemo(() => getStockByClone(stock, clones), [stock, clones]);
  const producaoByClone = useMemo(() => getTotalProducaoByClone(producoes, clones), [producoes, clones]);
  const perdasByClone = useMemo(() => getTotalPerdasByClone(perdas, clones), [perdas, clones]);

  const totalEstoque = stockBySetor.reduce((s, v) => s + v.total, 0);
  const totalProducao = producoes.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalPerdas = perdas.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalExpedicao = movimentacoes.filter(m => m.tipo === 'expedicao').reduce((s, m) => s + (m.quantidade || 0), 0);

  const setorChartData = stockBySetor.filter(s => s.total > 0).map(s => ({ name: s.setor.nome, value: s.total }));

  const mortalidadeData = clones.map(c => {
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
      <PageHeader title="Dashboard" description="Visão geral do viveiro de mudas" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Estoque Total" value={totalEstoque.toLocaleString('pt-BR')} icon={Package} />
        <StatCard title="Produção Total" value={totalProducao.toLocaleString('pt-BR')} icon={Factory} />
        <StatCard title="Total Perdas" value={totalPerdas.toLocaleString('pt-BR')} icon={Skull} />
        <StatCard title="Total Expedido" value={totalExpedicao.toLocaleString('pt-BR')} icon={TreePine} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Estoque por Setor */}
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