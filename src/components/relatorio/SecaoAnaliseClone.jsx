import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';

export default function SecaoAnaliseClone({ analiseClones }) {
  if (analiseClones.length === 0) return null;

  const melhor = [...analiseClones].sort((a, b) => Number(a.mortalidade) - Number(b.mortalidade))[0];
  const pior = [...analiseClones].sort((a, b) => Number(b.mortalidade) - Number(a.mortalidade))[0];

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <GitBranch className="w-5 h-5 text-purple-500" /> 🧬 Análise por Clone
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card className="p-4 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">🥇 Melhor Clone</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-400">{melhor?.nome}</p>
          <p className="text-sm text-green-600 dark:text-green-500 mt-1">Mortalidade: {melhor?.mortalidade}% — Prod: {melhor?.prod?.toLocaleString('pt-BR')}</p>
        </Card>
        <Card className="p-4 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/10">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">⚠️ Pior Clone</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-400">{pior?.nome}</p>
          <p className="text-sm text-red-600 dark:text-red-500 mt-1">Mortalidade: {pior?.mortalidade}% — Perdas: {pior?.perdas?.toLocaleString('pt-BR')}</p>
        </Card>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs uppercase bg-muted/30">
                <th className="text-left py-3 px-4">Clone</th>
                <th className="text-right py-3 px-4">Produção</th>
                <th className="text-right py-3 px-4">Perdas</th>
                <th className="text-right py-3 px-4">Mortalidade</th>
                <th className="text-right py-3 px-4">Estoque</th>
                <th className="text-right py-3 px-4">Expedido</th>
              </tr>
            </thead>
            <tbody>
              {analiseClones.map((c, i) => {
                const mort = Number(c.mortalidade);
                const mortCor = mort > 8 ? 'text-red-600' : mort > 5 ? 'text-amber-600' : 'text-green-600';
                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="py-3 px-4 font-medium">{c.nome}</td>
                    <td className="py-3 px-4 text-right">{c.prod.toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-4 text-right text-red-600">{c.perdas.toLocaleString('pt-BR')}</td>
                    <td className={`py-3 px-4 text-right font-bold ${mortCor}`}>{c.mortalidade}%</td>
                    <td className="py-3 px-4 text-right">{c.estoque.toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-4 text-right text-blue-600">{c.exp.toLocaleString('pt-BR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}