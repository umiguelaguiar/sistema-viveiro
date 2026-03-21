import React from 'react';
import { AlertTriangle, CheckCircle, TrendingDown, Truck } from 'lucide-react';

export default function AlertasGerenciais({ data }) {
  const { taxaPerda, eficiencia, totalProd, totalExp } = data;
  const alertas = [];

  if (taxaPerda > 8) alertas.push({ tipo: 'critico', icone: '🚨', msg: `Mortalidade acima da meta: ${taxaPerda.toFixed(1)}% (ideal: < 8%)` });
  if (eficiencia < 85) alertas.push({ tipo: 'critico', icone: '🚨', msg: `Eficiência crítica: ${eficiencia.toFixed(1)}% (mínimo recomendado: 85%)` });
  if (taxaPerda > 5 && taxaPerda <= 8) alertas.push({ tipo: 'atencao', icone: '⚠️', msg: `Mortalidade em atenção: ${taxaPerda.toFixed(1)}% (aproximando do limite de 8%)` });
  if (totalProd === 0) alertas.push({ tipo: 'atencao', icone: '⚠️', msg: 'Nenhuma produção registrada neste período.' });
  if (totalExp === 0 && totalProd > 0) alertas.push({ tipo: 'atencao', icone: '⚠️', msg: 'Sem expedições registradas neste período.' });
  if (eficiencia >= 92 && totalProd > 0) alertas.push({ tipo: 'ok', icone: '✅', msg: `Eficiência excelente: ${eficiencia.toFixed(1)}%` });

  if (alertas.length === 0) return null;

  return (
    <div className="space-y-2">
      {alertas.map((a, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium border ${
          a.tipo === 'critico' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300' :
          a.tipo === 'atencao' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300' :
          'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
        }`}>
          <span className="text-base">{a.icone}</span>
          {a.msg}
        </div>
      ))}
    </div>
  );
}