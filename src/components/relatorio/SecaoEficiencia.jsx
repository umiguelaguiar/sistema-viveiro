import React from 'react';
import { Card } from '@/components/ui/card';
import { Zap } from 'lucide-react';

function GaugeCard({ eficiencia }) {
  const cor = eficiencia >= 92 ? '#16a34a' : eficiencia >= 85 ? '#d97706' : '#dc2626';
  const label = eficiencia >= 92 ? '✅ Excelente' : eficiencia >= 85 ? '⚠️ Atenção' : '🚨 Crítico';
  const bg = eficiencia >= 92 ? 'bg-green-50 dark:bg-green-900/20' : eficiencia >= 85 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20';
  const border = eficiencia >= 92 ? 'border-green-200' : eficiencia >= 85 ? 'border-amber-200' : 'border-red-200';

  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 ${bg} ${border}`}>
      <div className="relative w-48 h-48 mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={cor} strokeWidth="12"
            strokeDasharray={`${(eficiencia / 100) * 251.2} 251.2`}
            strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: cor }}>{eficiencia.toFixed(1)}%</span>
        </div>
      </div>
      <p className="text-base font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">Meta: ≥ 92%</p>
    </div>
  );
}

export default function SecaoEficiencia({ eficiencia, totalProd, totalPerdas, prodMesAnt }) {
  const efAnt = prodMesAnt > 0 ? ((prodMesAnt - 0) / prodMesAnt * 100) : 0; // simplificado, sem perdas ant
  const variacao = totalProd > 0 ? eficiencia - 92 : 0;

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <Zap className="w-5 h-5 text-yellow-500" /> ⚖️ Eficiência Operacional
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GaugeCard eficiencia={eficiencia} />
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fórmula</p>
            <p className="text-xs font-mono mt-2 text-muted-foreground">(Produção - Perdas) / Produção × 100</p>
            <p className="text-sm mt-2">({totalProd.toLocaleString('pt-BR')} - {totalPerdas.toLocaleString('pt-BR')}) / {totalProd.toLocaleString('pt-BR')} × 100</p>
            <p className="text-2xl font-bold text-primary mt-1">= {eficiencia.toFixed(2)}%</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Vs. Meta (92%)</p>
            <p className={`text-3xl font-bold mt-2 ${variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{variacao >= 0 ? 'Acima da meta' : 'Abaixo da meta'}</p>
          </Card>
          <Card className="p-4 sm:col-span-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Escala de Referência</p>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-red-600 font-medium">🚨 &lt; 85%</span>
              <div className="flex-1 h-3 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-green-500 mx-2" />
              <span className="text-green-600 font-medium">✅ ≥ 92%</span>
            </div>
            <div className="relative mt-1 mx-2">
              <div className="h-1 w-full" />
              <div className="absolute top-[-8px]" style={{ left: `${Math.min(100, Math.max(0, eficiencia))}%`, transform: 'translateX(-50%)' }}>
                <div className="w-3 h-3 rounded-full bg-foreground border-2 border-background shadow" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}