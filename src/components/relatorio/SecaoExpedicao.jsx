import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Truck } from 'lucide-react';

export default function SecaoExpedicao({ expMes, cloneMap, evolucao }) {
  const total = expMes.reduce((s, m) => s + (m.quantidade || 0), 0);

  const porClone = useMemo(() => {
    const map = {};
    expMes.forEach(m => { const n = cloneMap[m.clone_id] || '?'; map[n] = (map[n] || 0) + (m.quantidade || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [expMes, cloneMap]);

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <Truck className="w-5 h-5 text-blue-500" /> 🚚 Expedição
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Expedido</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{total.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas expedidas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Operações</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{expMes.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">expedições realizadas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Clones Expedidos</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{porClone.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">clones diferentes</p>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">📈 Expedição — Evolução 6 Meses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="exped" name="Expedição" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">📊 Top Clones Expedidos</CardTitle></CardHeader>
          <CardContent>
            {porClone.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Sem expedições</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porClone} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Expedido" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}