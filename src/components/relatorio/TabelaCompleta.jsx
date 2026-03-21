import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TabelaCompleta({ prodMes, perdasMes, expMes, transfMes, cloneMap, loteMap, setorMap }) {
  const [aba, setAba] = useState('producao');

  const abas = [
    { key: 'producao', label: 'Produção', count: prodMes.length },
    { key: 'perdas', label: 'Perdas', count: perdasMes.length },
    { key: 'expedicao', label: 'Expedição', count: expMes.length },
    { key: 'transferencia', label: 'Transferências', count: transfMes.length },
  ];

  const fmt = (d) => { try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d || '—'; } };

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
        <Table className="w-5 h-5 text-gray-500" /> 📋 Tabela Detalhada
      </h2>
      <Card>
        <CardHeader className="pb-0">
          <div className="flex gap-2 flex-wrap">
            {abas.map(a => (
              <button
                key={a.key}
                onClick={() => setAba(a.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${aba === a.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {a.label} <span className="ml-1 opacity-70">({a.count})</span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            {aba === 'producao' && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="text-left py-2 pr-4">Data</th>
                    <th className="text-left py-2 pr-4">Clone</th>
                    <th className="text-left py-2 pr-4">Lote</th>
                    <th className="text-left py-2 pr-4">Setor</th>
                    <th className="text-right py-2">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {prodMes.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem registros</td></tr>
                    : prodMes.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 pr-4">{fmt(p.data)}</td>
                        <td className="py-2 pr-4">{cloneMap[p.clone_id] || '—'}</td>
                        <td className="py-2 pr-4">{loteMap[p.lote_id] || '—'}</td>
                        <td className="py-2 pr-4">{setorMap[p.setor_id] || '—'}</td>
                        <td className="py-2 text-right font-medium">{p.quantidade?.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
            {aba === 'perdas' && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="text-left py-2 pr-4">Data</th>
                    <th className="text-left py-2 pr-4">Clone</th>
                    <th className="text-left py-2 pr-4">Setor</th>
                    <th className="text-left py-2 pr-4">Motivo</th>
                    <th className="text-right py-2">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {perdasMes.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem registros</td></tr>
                    : perdasMes.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 pr-4">{fmt(p.data)}</td>
                        <td className="py-2 pr-4">{cloneMap[p.clone_id] || '—'}</td>
                        <td className="py-2 pr-4">{setorMap[p.setor_id] || '—'}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{p.motivo || '—'}</td>
                        <td className="py-2 text-right font-medium text-red-600">{p.quantidade?.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
            {aba === 'expedicao' && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="text-left py-2 pr-4">Data</th>
                    <th className="text-left py-2 pr-4">Clone</th>
                    <th className="text-left py-2 pr-4">Lote</th>
                    <th className="text-right py-2">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {expMes.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Sem registros</td></tr>
                    : expMes.map(m => (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 pr-4">{fmt(m.data)}</td>
                        <td className="py-2 pr-4">{cloneMap[m.clone_id] || '—'}</td>
                        <td className="py-2 pr-4">{loteMap[m.lote_id] || '—'}</td>
                        <td className="py-2 text-right font-medium text-blue-600">{m.quantidade?.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
            {aba === 'transferencia' && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="text-left py-2 pr-4">Data</th>
                    <th className="text-left py-2 pr-4">Clone</th>
                    <th className="text-left py-2 pr-4">Origem</th>
                    <th className="text-left py-2 pr-4">Destino</th>
                    <th className="text-right py-2">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {transfMes.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem registros</td></tr>
                    : transfMes.map(m => (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 pr-4">{fmt(m.data)}</td>
                        <td className="py-2 pr-4">{cloneMap[m.clone_id] || '—'}</td>
                        <td className="py-2 pr-4">{setorMap[m.setor_origem_id] || '—'}</td>
                        <td className="py-2 pr-4">{setorMap[m.setor_destino_id] || '—'}</td>
                        <td className="py-2 text-right font-medium text-amber-600">{m.quantidade?.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}