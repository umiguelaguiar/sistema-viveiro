import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CalendarCheck, CalendarX, FileText, TrendingUp, Trophy } from 'lucide-react';
import { getPeriodos, dataEstaNoPeriodo } from '@/lib/periodoColaboradores';

const todayLocal = () => new Date().toLocaleDateString('en-CA');
const periodoAtual = getPeriodos(1)[0];

export default function ColaboradoresDashboard() {
  const today = todayLocal();

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => base44.entities.Colaborador.list() });
  const { data: frequencias = [] } = useQuery({ queryKey: ['frequencias'], queryFn: () => base44.entities.Frequencia.list('-data', 500) });
  const { data: producoes = [] } = useQuery({ queryKey: ['producoes-colab'], queryFn: () => base44.entities.ProducaoColaborador.list('-data', 500) });

  const ativos = colaboradores.filter(c => (c.status_colaborador || 'ativo') === 'ativo').length;
  const afastados = colaboradores.filter(c => c.status_colaborador === 'afastado').length;

  const hoje = frequencias.filter(f => f.data === today);
  const presentes = hoje.filter(f => f.status === 'presente').length;
  const faltas = hoje.filter(f => f.status === 'falta').length;
  const atestados = hoje.filter(f => f.status === 'atestado').length;

  const freqPeriodo = frequencias.filter(f => periodoAtual && dataEstaNoPeriodo(f.data, periodoAtual.key));
  const totalProducao = producoes
    .filter(p => periodoAtual && dataEstaNoPeriodo(p.data, periodoAtual.key))
    .reduce((s, p) => s + (p.quantidade || 0), 0);

  const colabMap = Object.fromEntries(colaboradores.map(c => [c.id, c.nome]));
  const ranking = Object.entries(
    producoes
      .filter(p => periodoAtual && dataEstaNoPeriodo(p.data, periodoAtual.key))
      .reduce((acc, p) => { acc[p.colaborador_id] = (acc[p.colaborador_id] || 0) + (p.quantidade || 0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stats = [
    { label: 'Colaboradores Ativos', value: ativos, icon: Users, color: 'text-primary' },
    { label: 'Afastados', value: afastados, icon: Users, color: 'text-amber-600' },
    { label: 'Presença Hoje', value: presentes, icon: CalendarCheck, color: 'text-green-600' },
    { label: 'Faltas Hoje', value: faltas, icon: CalendarX, color: 'text-destructive' },
    { label: 'Atestados Hoje', value: atestados, icon: FileText, color: 'text-amber-600' },
    { label: `Produção (${periodoAtual?.label || ''})`, value: totalProducao.toLocaleString('pt-BR'), icon: TrendingUp, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex flex-col gap-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="w-4 h-4 text-amber-500" />Ranking de Produção — {periodoAtual?.label}</CardTitle></CardHeader>
        <CardContent>
          {ranking.length === 0 && <p className="text-sm text-muted-foreground">Sem dados de produção neste período.</p>}
          <div className="space-y-2">
            {ranking.map(([id, qty], i) => (
              <div key={id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{colabMap[id] || 'Desconhecido'}</span>
                    <span className="text-muted-foreground">{qty.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full mt-1">
                    <div className="h-1.5 bg-primary rounded-full" style={{ width: `${Math.min(100, (qty / (ranking[0]?.[1] || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}