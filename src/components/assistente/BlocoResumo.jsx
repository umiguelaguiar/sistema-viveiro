import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function BlocoResumo({ bloco }) {
  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <p className="text-sm font-semibold text-foreground">{bloco.titulo}</p>
        {(bloco.filtros || []).map((f, i) => (
          <span key={i} className="text-xs text-muted-foreground">{f.rotulo}: <strong className="font-medium text-foreground">{f.valor}</strong></span>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(bloco.itens || []).map((item, i) => (
          <div key={i} className="rounded-lg border bg-card px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground leading-tight">{item.rotulo}</p>
            <p className="text-lg font-bold text-foreground leading-tight mt-0.5">{item.valor}</p>
          </div>
        ))}
      </div>

      {(bloco.avisos || []).length > 0 && (
        <div className="mt-3 space-y-1">
          {bloco.avisos.map((a, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {a}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}