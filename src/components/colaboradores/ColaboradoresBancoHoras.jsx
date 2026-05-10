import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, TrendingUp, Banknote, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dataEstaNoPeriodo, getPeriodoDatasLabel } from '@/lib/periodoColaboradores';
import { usePeriodosComRegistros } from '@/hooks/usePeriodosComRegistros';

export default function ColaboradoresBancoHoras() {
  const [periodoKey, setPeriodoKey] = useState('');

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => base44.entities.Colaborador.list() });
  const { data: frequencias = [] } = useQuery({ queryKey: ['frequencias'], queryFn: () => base44.entities.Frequencia.list('-data', 1000) });

  const { periodos, periodoCorrente } = usePeriodosComRegistros(frequencias);
  useEffect(() => { if (!periodoKey && periodoCorrente) setPeriodoKey(periodoCorrente.key); }, [periodoCorrente]);

  // Para pagamento: filtra pelo período. Para banco de horas: usa tudo.
  const freqPeriodoPagamento = periodoKey === 'todos'
    ? frequencias
    : frequencias.filter(f => dataEstaNoPeriodo(f.data, periodoKey));

  // Determina a data de início do período selecionado para filtrar desligados
  const periodoInicio = useMemo(() => {
    if (!periodoKey || periodoKey === 'todos') return null;
    const [a, m] = periodoKey.split('-').map(Number);
    return new Date(a, m - 1, 20);
  }, [periodoKey]);

  const colabsComHoras = colaboradores
    .filter(c => {
      if ((c.status_colaborador || 'ativo') === 'inativo') return false;
      // Exclui desligados a partir do período em que a data de saída ocorreu
      if (c.status_colaborador === 'desligado' && c.data_saida && periodoInicio) {
        const dataSaida = new Date(c.data_saida + 'T12:00:00');
        return dataSaida >= periodoInicio;
      }
      return true;
    })
    .map(c => {
      const cfBanco = frequencias.filter(f => f.colaborador_id === c.id && f.status === 'presente');
      const cfPagamento = freqPeriodoPagamento.filter(f => f.colaborador_id === c.id && f.status === 'presente');
      const cf = cfBanco; // para diasPresente usamos tudo
      const totalExtras = cf.reduce((s, f) => s + (f.horas_extras || 0), 0);
      // Banco de horas: não utilizados (acumulado geral) + utilizados somente do período selecionado
      const extrasBanco = cfBanco.filter(f =>
        f.tipo_hora_extra === 'banco_horas' && (
          !f.banco_horas_utilizado ||
          (f.banco_horas_utilizado && periodoKey !== 'todos' && dataEstaNoPeriodo(f.data_utilizacao_banco, periodoKey))
        )
      ).reduce((s, f) => s + (f.horas_extras || 0), 0);
      // Pagamento: filtrado pelo período
      const extrasPagamento = cfPagamento.filter(f => f.tipo_hora_extra === 'pagamento').reduce((s, f) => s + (f.horas_extras || 0), 0);
      const totalTrabalhadas = cf.reduce((s, f) => s + (f.horas_trabalhadas || 0), 0);

      const diasPresente = cf.length;

      return { ...c, totalExtras, extrasBanco, extrasPagamento, totalTrabalhadas, diasPresente };
    })
    .sort((a, b) => b.totalExtras - a.totalExtras);

  const totalBanco = colabsComHoras.reduce((s, c) => s + c.extrasBanco, 0);
  const totalPagamento = colabsComHoras.reduce((s, c) => s + c.extrasPagamento, 0);

  // Detalhe por colaborador: lista de registros com horas extras
  const [colabDetalhe, setColabDetalhe] = useState(null);
  const [consumindo, setConsumindo] = useState({});
  const queryClient = useQueryClient();

  const detalhes = colabDetalhe
    ? frequencias.filter(f =>
        f.colaborador_id === colabDetalhe &&
        f.horas_extras > 0 &&
        f.tipo_hora_extra === 'banco_horas' &&
        (
          !f.banco_horas_utilizado ||
          (f.banco_horas_utilizado && periodoKey !== 'todos' && dataEstaNoPeriodo(f.data_utilizacao_banco, periodoKey))
        )
      )
    : [];

  const handleConsumirDia = async (freq, checked) => {
    setConsumindo(prev => ({ ...prev, [freq.id]: true }));
    await base44.entities.Frequencia.update(freq.id, {
      banco_horas_utilizado: checked,
      data_utilizacao_banco: checked ? new Date().toISOString().split('T')[0] : null
    });
    queryClient.invalidateQueries({ queryKey: ['frequencias'] });
    setConsumindo(prev => ({ ...prev, [freq.id]: false }));
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div>
          <Label className="text-xs mb-1 block">Período (Pagamento 100%)</Label>
          <Select value={periodoKey} onValueChange={setPeriodoKey}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registros de banco de horas</p>
                {detalhes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro de banco de horas.</p>}
                {detalhes.map(f => (
                  <div key={f.id} className={`flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0 gap-2 ${f.banco_horas_utilizado ? 'opacity-60' : ''}`}>
                    <span className="text-muted-foreground w-20">{f.data?.split('-').reverse().join('/')}</span>
                    <span className="hidden sm:inline text-muted-foreground">{f.hora_entrada}–{f.hora_saida}</span>
                    <Badge
                      variant="outline"
                      className={f.banco_horas_utilizado ? 'text-muted-foreground border-muted line-through' : 'text-blue-600 border-blue-300'}
                    >
                      +{f.horas_extras}h Banco
                    </Badge>
                    {f.banco_horas_utilizado && f.data_utilizacao_banco && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        Utilizado em {f.data_utilizacao_banco.split('-').reverse().join('/')}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Checkbox
                        id={`consumir-${f.id}`}
                        checked={!!f.banco_horas_utilizado}
                        disabled={consumindo[f.id]}
                        onCheckedChange={(checked) => handleConsumirDia(f, checked)}
                      />
                      <label htmlFor={`consumir-${f.id}`} className="text-xs text-muted-foreground cursor-pointer select-none whitespace-nowrap">
                        {f.banco_horas_utilizado ? 'Utilizado' : 'Marcar como utilizado'}
                      </label>
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