import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { dataEstaNoPeriodo, formatPeriodoLabel, getPeriodoDatasLabel } from '@/lib/periodoColaboradores';
import { usePeriodosComRegistros } from '@/hooks/usePeriodosComRegistros';

const ATIVIDADES = { tubete: 'Tubete', selecao: 'Seleção', irrigacao: 'Irrigação', expedicao: 'Expedição' };
export default function ColaboradoresRelatorio() {
  const [periodoKey, setPeriodoKey] = useState('');

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => base44.entities.Colaborador.list() });
  const { data: frequencias = [] } = useQuery({ queryKey: ['frequencias'], queryFn: () => base44.entities.Frequencia.list('-data', 1000) });
  const { data: producoes = [] } = useQuery({ queryKey: ['producoes-colab'], queryFn: () => base44.entities.ProducaoColaborador.list('-data', 1000) });

  const { periodos, periodoCorrente } = usePeriodosComRegistros(frequencias);
  useEffect(() => { if (!periodoKey && periodoCorrente) setPeriodoKey(periodoCorrente.key); }, [periodoCorrente]);

  const freqPeriodo = periodoKey === 'todos' ? frequencias : frequencias.filter(f => dataEstaNoPeriodo(f.data, periodoKey));
  const prodPeriodo = periodoKey === 'todos' ? producoes : producoes.filter(p => dataEstaNoPeriodo(p.data, periodoKey));

  const colabAtivos = colaboradores.filter(c => (c.status_colaborador || 'ativo') !== 'inativo' && (c.status_colaborador || 'ativo') !== 'desligado');

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Label>Período:</Label>
          <Select value={periodoKey} onValueChange={setPeriodoKey}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              {periodos.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {periodoKey !== 'todos' && <>
          <span className="text-sm text-muted-foreground capitalize">{formatPeriodoLabel(periodoKey)}</span>
          <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">{getPeriodoDatasLabel(periodoKey)}</span>
        </>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-3 py-2 font-medium">Colaborador</th>
              <th className="text-center px-3 py-2 font-medium text-green-700">Pres.</th>
              <th className="text-center px-3 py-2 font-medium text-destructive">Faltas</th>
              <th className="text-center px-3 py-2 font-medium text-amber-600">Ates.</th>
              <th className="text-center px-3 py-2 font-medium text-blue-600">Folgas</th>
              <th className="text-center px-3 py-2 font-medium text-purple-600">Plantões</th>
              <th className="text-center px-3 py-2 font-medium">H. Extras</th>
              <th className="text-center px-3 py-2 font-medium">Produção</th>
            </tr>
          </thead>
          <tbody>
            {colabAtivos.map(c => {
              const cf = freqPeriodo.filter(f => f.colaborador_id === c.id);
              const presentes = cf.filter(f => f.status === 'presente').length;
              const faltas = cf.filter(f => f.status === 'falta' && !f.falta_compensada).length;
              const atestados = cf.filter(f => f.status === 'atestado').length;
              const folgas = cf.filter(f => f.status === 'folga').length;
              const plantoesBanco = cf.filter(f => f.e_plantao && f.tipo_hora_extra === 'banco_horas').length;
              const hExtrasBanco = cf.filter(f => f.tipo_hora_extra === 'banco_horas' && !f.banco_horas_utilizado).reduce((s, f) => s + (f.horas_extras || 0), 0);
              const hExtrasPagamento = cf.filter(f => f.tipo_hora_extra === 'pagamento').reduce((s, f) => s + (f.horas_extras || 0), 0);
              const hExtras = hExtrasBanco + hExtrasPagamento;
              const producao = prodPeriodo.filter(p => p.colaborador_id === c.id).reduce((s, p) => s + (p.quantidade || 0), 0);
              return (
                <tr key={c.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-3 py-2 font-medium">
                    {c.nome}
                    <br /><span className="text-xs text-muted-foreground font-normal">{c.funcao}</span>
                    {c.status_colaborador === 'afastado' && <Badge variant="secondary" className="ml-1 text-xs">Afastado</Badge>}
                  </td>
                  <td className="text-center px-3 py-2 text-green-700 font-medium">{presentes}</td>
                  <td className="text-center px-3 py-2 text-destructive font-medium">{faltas}</td>
                  <td className="text-center px-3 py-2 text-amber-600 font-medium">{atestados}</td>
                  <td className="text-center px-3 py-2 text-blue-600 font-medium">{folgas}</td>
                  <td className="text-center px-3 py-2 text-purple-600 font-medium">{plantoesBanco > 0 ? plantoesBanco : <span className="text-muted-foreground">—</span>}</td>
                  <td className="text-center px-3 py-2">
                    {hExtras > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        {hExtrasBanco > 0 && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">+{hExtrasBanco.toFixed(1)}h Banco</Badge>}
                        {hExtrasPagamento > 0 && <Badge variant="outline" className="text-xs text-green-600 border-green-300">+{hExtrasPagamento.toFixed(1)}h Pgto</Badge>}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="text-center px-3 py-2 font-medium">
                    {producao > 0 ? producao.toLocaleString('pt-BR') : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {colabAtivos.length === 0 && <p className="text-sm text-muted-foreground p-4">Nenhum colaborador cadastrado.</p>}
      </div>
    </div>
  );
}