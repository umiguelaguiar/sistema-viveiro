import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, TrendingUp, Banknote } from 'lucide-react';
import { getPeriodos, dataEstaNoPeriodo, getPeriodoDatasLabel } from '@/lib/periodoColaboradores';

const periodos = getPeriodos(12);

export default function ColaboradoresBancoHoras() {
  const [periodoKey, setPeriodoKey] = useState(periodos[0]?.key || '');

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => base44.entities.Colaborador.list() });
  const { data: frequencias = [] } = useQuery({ queryKey: ['frequencias'], queryFn: () => base44.entities.Frequencia.list('-data', 1000) });

  const freqPeriodo = periodoKey === 'todos'
    ? frequencias
    : frequencias.filter(f => dataEstaNoPeriodo(f.data, periodoKey));

  const colabsComHoras = colaboradores
    .filter(c => (c.status_colaborador || 'ativo') !== 'inativo')
    .map(c => {
      const cf = freqPeriodo.filter(f => f.colaborador_id === c.id && f.status === 'presente');
      const totalExtras = cf.reduce((s, f) => s + (f.horas_extras || 0), 0);
      const extrasBanco = cf.filter(f => f.tipo_hora_extra === 'banco_horas').reduce((s, f) => s + (f.horas_extras || 0), 0);
      const extrasPagamento = cf.filter(f => f.tipo_hora_extra === 'pagamento').reduce((s, f) => s + (f.horas_extras || 0), 0);
      const totalTrabalhadas = cf.reduce((s, f) => s + (f.horas_trabalhadas || 0), 0);

      // Dias trabalhados vs esperados (dias úteis no período)
      const diasPresente = cf.length;

      return { ...c, totalExtras, extrasBanco, extrasPagamento, totalTrabalhadas, diasPresente };
    })
    .sort((a, b) => b.totalExtras - a.totalExtras);

  const totalBanco = colabsComHoras.reduce((s, c) => s + c.extrasBanco, 0);
  const totalPagamento = colabsComHoras.reduce((s, c) => s + c.extrasPagamento, 0);

  // Detalhe por colaborador: lista de registros com horas extras
  const [colabDetalhe, setColabDetalhe] = useState(null);
  const detalhes = colabDetalhe
    ? freqPeriodo.filter(f => f.colaborador_id === colabDetalhe && f.horas_extras > 0)
    : [];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div>
          <Label className="text-xs mb-1 block">Período</Label>
          <Select value={periodoKey} onValueChange={setPeriodoKey}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              {periodos.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {periodoKey !== 'todos' && <p className="text-xs text-muted-foreground mt-1">{getPeriodoDatasLabel(periodoKey)}</p>}
        </div>
        <div className="flex gap-3">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600">Total Banco de Horas</p>
                <p className="font-bold text-blue-700">{totalBanco.toFixed(1)}h</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs text-green-600">Total Pagamento</p>
                <p className="font-bold text-green-700">{totalPagamento.toFixed(1)}h</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabela por colaborador */}
      <div className="space-y-3">
        {colabsComHoras.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
              onClick={() => setColabDetalhe(colabDetalhe === c.id ? null : c.id)}
            >
              <div className="text-left">
                <p className="font-medium text-sm">{c.nome}</p>
                <p className="text-xs text-muted-foreground">{c.funcao} · {c.diasPresente} dias presentes</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {c.extrasBanco > 0 && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                    <Clock className="w-3 h-3 mr-1" />Banco: {c.extrasBanco.toFixed(1)}h
                  </Badge>
                )}
                {c.extrasPagamento > 0 && (
                  <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                    <Banknote className="w-3 h-3 mr-1" />Pgto: {c.extrasPagamento.toFixed(1)}h
                  </Badge>
                )}
                {c.totalExtras === 0 && <span className="text-xs text-muted-foreground">Sem horas extras</span>}
                <TrendingUp className={`w-4 h-4 ${colabDetalhe === c.id ? 'rotate-180' : ''} text-muted-foreground transition-transform`} />
              </div>
            </button>

            {colabDetalhe === c.id && (
              <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registros com horas extras</p>
                {detalhes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro com horas extras neste período.</p>}
                {detalhes.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{f.data?.split('-').reverse().join('/')}</span>
                    <span>{f.hora_entrada}–{f.hora_saida}</span>
                    <span className="font-medium">{f.horas_trabalhadas}h trabalhadas</span>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={f.tipo_hora_extra === 'banco_horas' ? 'text-blue-600 border-blue-300' : 'text-green-600 border-green-300'}
                      >
                        +{f.horas_extras}h · {f.tipo_hora_extra === 'banco_horas' ? 'Banco' : 'Pagamento'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}