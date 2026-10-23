import React from 'react';
import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CORES = ['#15803d', '#d97706', '#2563eb', '#9333ea', '#dc2626', '#0891b2'];

export default function BlocoGrafico({ bloco }) {
  const { formato, titulo, chave, series = [], dados = [] } = bloco;
  if (!dados.length) return null;

  const eixo = {
    tick: { fontSize: 11 },
  };
  const tooltip = {
    contentStyle: { borderRadius: '8px', fontSize: '12px' },
    formatter: (v, nome) => [Number(v).toLocaleString('pt-BR'), nome],
  };

  return (
    <Card className="p-4">
      {titulo && <p className="text-sm font-semibold mb-4">{titulo}</p>}
      <ResponsiveContainer width="100%" height={280}>
        {formato === 'linhas' ? (
          <LineChart data={dados} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={chave} {...eixo} angle={-30} textAnchor="end" height={58} interval="preserveStartEnd" />
            <YAxis {...eixo} />
            <Tooltip {...tooltip} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {series.map((s, i) => (
              <Line
                key={s.chave}
                type="monotone"
                dataKey={s.chave}
                name={s.nome}
                stroke={CORES[i % CORES.length]}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={dados} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={chave} {...eixo} angle={-30} textAnchor="end" height={58} interval={0} />
            <YAxis {...eixo} />
            <Tooltip {...tooltip} />
            <Bar dataKey={series[0]?.chave} name={series[0]?.nome} fill={CORES[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}