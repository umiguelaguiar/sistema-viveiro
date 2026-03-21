import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';

function KPIItem({ label, value, sub, cor }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${cor || 'text-foreground'}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default function ResumoExecutivo({ data, mesLabel }) {
  const { totalProd, totalPerdas, taxaPerda, totalExp, eficiencia, estoqueTotal } = data;
  const efCor = eficiencia >= 92 ? 'text-green-600' : eficiencia >= 85 ? 'text-amber-600' : 'text-red-600';
  const perdCor = taxaPerda > 8 ? 'text-red-600' : taxaPerda > 5 ? 'text-amber-600' : 'text-green-600';

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart2 className="w-5 h-5 text-primary" />
          📊 Resumo Executivo — {mesLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
          <KPIItem label="Produção" value={totalProd.toLocaleString('pt-BR')} sub="mudas" cor="text-primary" />
          <KPIItem label="Perdas" value={totalPerdas.toLocaleString('pt-BR')} sub={`${taxaPerda.toFixed(1)}%`} cor={perdCor} />
          <KPIItem label="Expedido" value={totalExp.toLocaleString('pt-BR')} sub="mudas" cor="text-blue-600" />
          <KPIItem label="Eficiência" value={`${eficiencia.toFixed(1)}%`} sub={eficiencia >= 92 ? '✅ Excelente' : eficiencia >= 85 ? '⚠️ Atenção' : '🚨 Crítico'} cor={efCor} />
          <KPIItem label="Estoque Final" value={estoqueTotal.toLocaleString('pt-BR')} sub="mudas totais" cor="text-foreground" />
          <KPIItem label="Taxa de Perda" value={`${taxaPerda.toFixed(1)}%`} sub={taxaPerda > 8 ? '🚨 Acima da meta' : taxaPerda > 5 ? '⚠️ Em atenção' : '✅ Normal'} cor={perdCor} />
        </div>
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📌 Interpretação automática</p>
          <ul className="space-y-1 text-sm">
            {taxaPerda > 8 && <li className="flex items-center gap-2 text-red-600">🚨 Mortalidade acima da meta (ideal: &lt; 8%)</li>}
            {taxaPerda > 5 && taxaPerda <= 8 && <li className="flex items-center gap-2 text-amber-600">⚠️ Mortalidade em zona de atenção</li>}
            {eficiencia < 85 && <li className="flex items-center gap-2 text-red-600">🚨 Eficiência operacional crítica</li>}
            {totalExp === 0 && totalProd > 0 && <li className="flex items-center gap-2 text-amber-600">📉 Expedição abaixo do esperado (nenhuma expedição no período)</li>}
            {eficiencia >= 92 && <li className="flex items-center gap-2 text-green-600">✅ Eficiência dentro da meta</li>}
            {taxaPerda <= 5 && totalProd > 0 && <li className="flex items-center gap-2 text-green-600">✅ Mortalidade dentro do padrão ideal</li>}
            {totalProd === 0 && <li className="flex items-center gap-2 text-muted-foreground">ℹ️ Nenhuma produção registrada neste período</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}