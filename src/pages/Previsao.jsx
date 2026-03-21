import React, { useMemo, useState, useEffect } from 'react';
import { useProducoes, useMovimentacoes, useClones, useLotes } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { subDays, format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, Calendar, Target, Sun } from 'lucide-react';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(36, 80%, 50%)', 'hsl(200, 60%, 45%)'];

export default function Previsao() {
  const { data: producoes } = useProducoes();
  const { data: movimentacoes } = useMovimentacoes();
  const { data: clones } = useClones();
  const { data: lotes } = useLotes();

  const [cloneFiltro, setCloneFiltro] = useState('todos');
  const [loteFiltro, setLoteFiltro] = useState('todos');
  const [meta, setMeta] = useState(() => localStorage.getItem('previsao_meta') || '');
  const [pegamento, setPegamento] = useState(() => localStorage.getItem('previsao_pegamento') || '100');
  const [periodo, setPeriodo] = useState(() => localStorage.getItem('previsao_periodo') || '30');

  useEffect(() => {
    localStorage.setItem('previsao_meta', meta);
  }, [meta]);

  useEffect(() => {
    localStorage.setItem('previsao_pegamento', pegamento);
  }, [pegamento]);

  useEffect(() => {
    localStorage.setItem('previsao_periodo', periodo);
  }, [periodo]);

  const prodFiltradas = useMemo(() => {
    let f = producoes;
    if (cloneFiltro !== 'todos') f = f.filter(p => p.clone_id === cloneFiltro);
    if (loteFiltro !== 'todos') f = f.filter(p => p.lote_id === loteFiltro);
    return f;
  }, [producoes, cloneFiltro, loteFiltro]);

  // Média do período selecionado (apenas dias úteis: seg-sex)
  const hoje = new Date();
  const periodoNum = Number(periodo) || 30;
  const ultimosPeriodo = prodFiltradas.filter(p => {
    if (!p.data) return false;
    try { return isWithinInterval(parseISO(p.data), { start: subDays(hoje, periodoNum), end: hoje }); } catch { return false; }
  });
  const totalUltPeriodo = ultimosPeriodo.reduce((s, p) => s + (p.quantidade || 0), 0);
  
  // Contar apenas dias úteis (seg-sex) no período
  let diasUteis = 0;
  for (let i = 0; i < periodoNum; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) diasUteis++; // 0=dom, 6=sab
  }
  const mediaDiaria = diasUteis > 0 ? totalUltPeriodo / diasUteis : 0;

  const taxaPegamento = Math.min(100, Math.max(0, Number(pegamento) || 100)) / 100;

  const previsaoDiaria = Math.round(mediaDiaria * taxaPegamento);
  const previsaoSemanal = Math.round(mediaDiaria * 5 * taxaPegamento); // 5 dias úteis
  const previsaoMensal = Math.round(mediaDiaria * 22 * taxaPegamento); // ~22 dias úteis/mês
  const previsaoAnual = Math.round(mediaDiaria * 252 * taxaPegamento); // 252 dias úteis/ano

  // Histórico mensal (12 meses)
  const historicoMensal = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(hoje, 11 - i);
      const label = format(d, 'MMM/yy', { locale: ptBR });
      const iv = { start: startOfMonth(d), end: endOfMonth(d) };
      const inIv = (dt) => { try { return isWithinInterval(parseISO(dt), iv); } catch { return false; } };
      const real = prodFiltradas.filter(p => inIv(p.data)).reduce((s, p) => s + (p.quantidade || 0), 0);
      return { label, real, previsao: i >= 10 ? Math.round(mediaDiaria * 30) : undefined };
    });
  }, [prodFiltradas, mediaDiaria]);

  // Top clones por produção (para sugestão)
  const topClones = useMemo(() => {
    const map = {};
    producoes.forEach(p => {
      const c = clones.find(c => c.id === p.clone_id);
      if (!c) return;
      map[c.codigo_clone] = (map[c.codigo_clone] || 0) + (p.quantidade || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [producoes, clones]);

  return (
    <div>
      <PageHeader title="Previsão de Produção" description="Projeções semanais, mensais e anuais baseadas no histórico" />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Select value={cloneFiltro} onValueChange={setCloneFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Clone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clones</SelectItem>
            {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={loteFiltro} onValueChange={setLoteFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Lote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os lotes</SelectItem>
            {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
           <Label className="text-sm whitespace-nowrap">Meta anual:</Label>
           <Input 
             type="text" 
             placeholder="Ex: 600.000" 
             className="w-36" 
             value={meta ? Number(meta).toLocaleString('pt-BR') : ''} 
             onChange={e => setMeta(e.target.value.replace(/\D/g, ''))} 
           />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">% Pegamento:</Label>
          <Input type="number" min="1" max="100" placeholder="Ex: 85" className="w-24" value={pegamento} onChange={e => setPegamento(e.target.value)} />
          <span className="text-xs text-muted-foreground">% das mudas que chegam vivas à expedição</span>
        </div>
      </div>
      {Number(pegamento) < 100 && (
        <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          ⚠️ Pegamento de <strong>{pegamento}%</strong> aplicado — previsões mostram mudas esperadas na expedição, descontando {100 - Number(pegamento)}% de perdas no processo.
        </div>
      )}

      {/* KPIs de previsão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Sun className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Previsão Diária</p>
              <p className="text-2xl font-bold text-green-600">{previsaoDiaria.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">mudas / dia</p>
            </div>
          </div>
          {meta && <div className={`mt-2 text-xs font-medium ${previsaoDiaria >= (Number(meta) / 365 * taxaPegamento) ? 'text-green-600' : 'text-amber-600'}`}>
            Meta diária: {Math.round(Number(meta) / 365 * taxaPegamento).toLocaleString('pt-BR')} — {previsaoDiaria >= (Number(meta) / 365 * taxaPegamento) ? '✅ Atingida' : '⚠️ Abaixo'}
          </div>}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Previsão Semanal</p>
              <p className="text-2xl font-bold text-primary">{previsaoSemanal.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">mudas / 5 dias úteis</p>
            </div>
          </div>
          {meta && <div className={`mt-2 text-xs font-medium ${previsaoSemanal >= (Number(meta) / 52 * taxaPegamento) ? 'text-green-600' : 'text-amber-600'}`}>
            Meta semanal: {Math.round(Number(meta) / 52 * taxaPegamento).toLocaleString('pt-BR')} — {previsaoSemanal >= (Number(meta) / 52 * taxaPegamento) ? '✅ Atingida' : '⚠️ Abaixo'}
          </div>}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Previsão Mensal</p>
              <p className="text-2xl font-bold text-amber-600">{previsaoMensal.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">mudas / ~22 dias úteis</p>
            </div>
          </div>
          {meta && <div className={`mt-2 text-xs font-medium ${previsaoMensal >= (Number(meta) / 12 * taxaPegamento) ? 'text-green-600' : 'text-amber-600'}`}>
            Meta mensal: {Math.round(Number(meta) / 12 * taxaPegamento).toLocaleString('pt-BR')} — {previsaoMensal >= (Number(meta) / 12 * taxaPegamento) ? '✅ Atingida' : '⚠️ Abaixo'}
          </div>}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Previsão Anual</p>
              <p className="text-2xl font-bold text-blue-600">{previsaoAnual.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">mudas / ~252 dias úteis</p>
            </div>
          </div>
          {meta && <div className={`mt-2 text-xs font-medium ${previsaoAnual >= (Number(meta) * taxaPegamento) ? 'text-green-600' : 'text-amber-600'}`}>
            Meta anual: {Math.round(Number(meta) * taxaPegamento).toLocaleString('pt-BR')} — {previsaoAnual >= (Number(meta) * taxaPegamento) ? '✅ Atingida' : '⚠️ Abaixo'}
          </div>}
        </Card>
      </div>

      {/* Gráfico histórico + projeção */}
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Histórico + Projeção (12 meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historicoMensal}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,12%,88%)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="real" name="Produção Real" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="previsao" name="Previsão" stroke={COLORS[1]} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
            {meta && <ReferenceLine y={Number(meta)} stroke="hsl(0,72%,51%)" strokeDasharray="4 2" label={{ value: 'Meta', position: 'right', fontSize: 11 }} />}
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">* Previsão baseada na média diária dos últimos 30 dias (apenas seg-sex)</p>
      </Card>

      {/* Top clones */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Top 5 Clones — Produção Acumulada</h3>
        <div className="space-y-3">
          {topClones.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem dados</p>
          ) : topClones.map(([nome, total], i) => {
            const max = topClones[0][1];
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-medium w-6 text-muted-foreground">#{i + 1}</span>
                <span className="text-sm font-medium w-24 truncate">{nome}</span>
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(total / max) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-primary w-20 text-right">{total.toLocaleString('pt-BR')}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}