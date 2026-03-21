import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function SecaoPrevisoes({ mediaDiaria, estoquePorSetor }) {
  const p7 = Math.round(mediaDiaria * 7);
  const p30 = Math.round(mediaDiaria * 30);
  const p365 = Math.round(mediaDiaria * 365);

  const rustificacao = estoquePorSetor.find(s => s.nome?.toLowerCase().includes('rustif') || s.nome?.toLowerCase().includes('rust'));

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <TrendingUp className="w-5 h-5 text-indigo-500" /> 🔮 Previsões
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Em 1 dia</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{Math.round(mediaDiaria).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas previstas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Em 7 dias</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{p7.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas previstas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Em 30 dias</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{p30.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas previstas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Em 1 ano</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{p365.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas previstas</p>
        </Card>
      </div>
      {rustificacao && (
        <Card className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">🚚 Previsão de Expedição</p>
          <p className="text-sm text-indigo-600 dark:text-indigo-400">
            Estoque em <strong>{rustificacao.nome}</strong>: <strong>{rustificacao.total.toLocaleString('pt-BR')} mudas</strong> — prontas para expedição.
          </p>
        </Card>
      )}
      <p className="text-xs text-muted-foreground mt-3">* Baseado na média diária dos últimos 30 dias: {Math.round(mediaDiaria).toLocaleString('pt-BR')} mudas/dia</p>
    </div>
  );
}