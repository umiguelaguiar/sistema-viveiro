import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Skull } from 'lucide-react';

const COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#2d7a4f'];

export default function SecaoPerdas({ perdasMes, cloneMap, setorMap, totalProd }) {
  const total = perdasMes.reduce((s, p) => s + (p.quantidade || 0), 0);
  const taxa = totalProd > 0 ? ((total / totalProd) * 100).toFixed(1) : '0.0';
  const taxaCor = Number(taxa) > 8 ? 'text-red-600' : Number(taxa) > 5 ? 'text-amber-600' : 'text-green-600';

  const porClone = useMemo(() => {
    const map = {};
    perdasMes.forEach(p => { const n = cloneMap[p.clone_id] || '?'; map[n] = (map[n] || 0) + (p.quantidade || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [perdasMes, cloneMap]);

  const porMotivo = useMemo(() => {
    const map = {};
    perdasMes.forEach(p => { const m = p.motivo || 'Não informado'; map[m] = (map[m] || 0) + (p.quantidade || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [perdasMes]);

  const porSetor = useMemo(() => {
    const map = {};
    perdasMes.forEach(p => { const n = setorMap[p.setor_id] || '?'; map[n] = (map[n] || 0) + (p.quantidade || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [perdasMes, setorMap]);

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <Skull className="w-5 h-5 text-red-500" /> 💀 Perdas
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Perdas</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{total.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas perdidas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Taxa de Mortalidade</p>
          <p className={`text-3xl font-bold mt-1 ${taxaCor}`}>{taxa}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">meta: &lt; 8%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Setores Afetados</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{porSetor.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">setores com perdas</p>
        </Card>
      </div>
      {total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">📊 Mortalidade por Clone</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porClone} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Perdas" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">🍰 Perdas por Motivo</CardTitle></CardHeader>
            <CardContent>
              {porMotivo.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Sem dados de motivo</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={porMotivo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {porMotivo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}