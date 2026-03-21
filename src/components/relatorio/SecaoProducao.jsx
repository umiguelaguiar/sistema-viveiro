import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Factory } from 'lucide-react';

const COLORS = ['#2d7a4f', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function SecaoProducao({ prodMes, cloneMap, evolucao }) {
  const total = prodMes.reduce((s, p) => s + (p.quantidade || 0), 0);

  const porClone = useMemo(() => {
    const map = {};
    prodMes.forEach(p => { const n = cloneMap[p.clone_id] || '?'; map[n] = (map[n] || 0) + (p.quantidade || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [prodMes, cloneMap]);

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <Factory className="w-5 h-5 text-primary" /> 📈 Produção
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total no Período</p>
          <p className="text-3xl font-bold text-primary mt-1">{total.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas produzidas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Média Diária</p>
          <p className="text-3xl font-bold text-primary mt-1">{Math.round(total / 30).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas/dia (estimado)</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Clones Ativos</p>
          <p className="text-3xl font-bold text-primary mt-1">{porClone.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">clones com produção</p>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">📈 Evolução — Últimos 6 Meses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="prod" name="Produção" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">📊 Top 5 Clones Produzidos</CardTitle></CardHeader>
          <CardContent>
            {porClone.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porClone} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Qtd" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}