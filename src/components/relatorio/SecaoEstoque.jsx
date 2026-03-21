import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Boxes } from 'lucide-react';

const COLORS = ['#2d7a4f', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function SecaoEstoque({ estoquePorSetor, estoquePorClone, estoqueTotal }) {
  const pieData = estoquePorSetor.map((s) => ({ name: s.nome, value: s.total }));
  const barData = estoquePorClone.slice(0, 8);

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <Boxes className="w-5 h-5 text-blue-500" /> 📦 Estoque
      </h2>
      {/* Resumo: Total + 3 setores principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Estoque Total</p>
          <p className="text-3xl font-bold text-foreground mt-1">{estoqueTotal.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas em estoque</p>
        </Card>
        {estoquePorSetor.map((s, i) => (
          <Card key={i} className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider truncate">{s.nome}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: COLORS[i % COLORS.length] }}>{s.total.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{estoqueTotal > 0 ? ((s.total / estoqueTotal) * 100).toFixed(1) : 0}%</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">🍰 Distribuição por Setor</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Sem estoque</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 10) + '...' : name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString('pt-BR')} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">📊 Estoque por Clone</CardTitle></CardHeader>
          <CardContent>
            {barData.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Estoque" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}