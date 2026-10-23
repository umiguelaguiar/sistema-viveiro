import React from 'react';
import { Card } from '@/components/ui/card';

export default function BlocoTabela({ bloco }) {
  if (!bloco.linhas?.length) return null;
  return (
    <Card className="overflow-hidden">
      {bloco.titulo && (
        <p className="text-sm font-semibold px-4 py-3 border-b bg-muted/40">{bloco.titulo}</p>
      )}
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/70 backdrop-blur">
            <tr>
              {(bloco.colunas || []).map((c, i) => (
                <th key={i} className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloco.linhas.map((linha, ri) => (
              <tr key={ri} className="border-t hover:bg-muted/30 transition-colors">
                {linha.map((celula, ci) => (
                  <td key={ci} className={`px-3 py-2 whitespace-nowrap ${ci === 0 ? 'font-medium' : 'text-right tabular-nums'}`}>
                    {celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}