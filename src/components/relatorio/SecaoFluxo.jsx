import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowRightLeft } from 'lucide-react';

export default function SecaoFluxo({ transfMes, expMes, setorMap, cloneMap }) {
  const totalTransf = transfMes.reduce((s, m) => s + (m.quantidade || 0), 0);
  const totalExp = expMes.reduce((s, m) => s + (m.quantidade || 0), 0);

  const fluxoPorSetor = useMemo(() => {
    const map = {};
    transfMes.forEach(m => {
      const origem = setorMap[m.setor_origem_id] || 'Desconhecido';
      const destino = setorMap[m.setor_destino_id] || 'Desconhecido';
      const key = `${origem} → ${destino}`;
      map[key] = (map[key] || 0) + (m.quantidade || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transfMes, setorMap]);

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <ArrowRightLeft className="w-5 h-5 text-amber-500" /> 🔄 Fluxo Operacional
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Transferências</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{totalTransf.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{transfMes.length} operações</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Expedições</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{totalExp.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{expMes.length} operações</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Movimentado</p>
          <p className="text-3xl font-bold text-foreground mt-1">{(totalTransf + totalExp).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">mudas movimentadas</p>
        </Card>
      </div>
      {fluxoPorSetor.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Rotas de Transferência</p>
          <div className="space-y-2">
            {fluxoPorSetor.map(([rota, qtd], i) => {
              const max = fluxoPorSetor[0][1];
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm w-52 truncate text-muted-foreground">{rota}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(qtd / max) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold w-16 text-right">{qtd.toLocaleString('pt-BR')}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}