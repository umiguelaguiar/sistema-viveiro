import React, { useMemo, useState, useRef } from 'react';
import { useProducoes, useMovimentacoes, usePerdas, useClones, useSetores, useLotes } from '@/hooks/useNurseryData';
import { calculateStock } from '@/lib/stockCalculations';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#2d7a4f', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f97316'];

function kpi(label, value, color = 'text-foreground') {
  return { label, value, color };
}

export default function Relatorio() {
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));
  const [exportando, setExportando] = useState(false);
  const contentRef = useRef(null);

  const { data: producoes } = useProducoes();
  const { data: movimentacoes } = useMovimentacoes();
  const { data: perdas } = usePerdas();
  const { data: clones } = useClones();
  const { data: setores } = useSetores();
  const { data: lotes } = useLotes();

  const cloneMap = useMemo(() => Object.fromEntries(clones.map(c => [c.id, c.codigo_clone])), [clones]);
  const setorMap = useMemo(() => Object.fromEntries(setores.map(s => [s.id, s.nome])), [setores]);
  const loteMap = useMemo(() => Object.fromEntries(lotes.map(l => [l.id, l.codigo])), [lotes]);

  const mesDate = useMemo(() => new Date(mes + '-15'), [mes]);
  const intervalo = useMemo(() => ({
    start: startOfMonth(mesDate),
    end: endOfMonth(mesDate),
  }), [mesDate]);

  const inInterval = (d) => {
    try { return isWithinInterval(parseISO(d), intervalo); } catch { return false; }
  };

  const prodMes = useMemo(() => producoes.filter(p => inInterval(p.data)), [producoes, intervalo]);
  const perdasMes = useMemo(() => perdas.filter(p => inInterval(p.data)), [perdas, intervalo]);
  const expedicoesMes = useMemo(() => movimentacoes.filter(m => m.tipo === 'expedicao' && inInterval(m.data)), [movimentacoes, intervalo]);
  const transferenciasMes = useMemo(() => movimentacoes.filter(m => m.tipo === 'transferencia' && inInterval(m.data)), [movimentacoes, intervalo]);

  const totalProd = prodMes.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalPerdas = perdasMes.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalExpedicao = expedicoesMes.reduce((s, m) => s + (m.quantidade || 0), 0);
  const totalTransf = transferenciasMes.reduce((s, m) => s + (m.quantidade || 0), 0);
  const taxaPerda = totalProd > 0 ? ((totalPerdas / totalProd) * 100).toFixed(1) : 0;

  // Produção por clone no mês
  const prodPorClone = useMemo(() => {
    const map = {};
    prodMes.forEach(p => {
      const nome = cloneMap[p.clone_id] || 'Desconhecido';
      map[nome] = (map[nome] || 0) + (p.quantidade || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [prodMes, cloneMap]);

  // Perdas por clone
  const perdasPorClone = useMemo(() => {
    const map = {};
    perdasMes.forEach(p => {
      const nome = cloneMap[p.clone_id] || 'Desconhecido';
      map[nome] = (map[nome] || 0) + (p.quantidade || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [perdasMes, cloneMap]);

  // Produção por setor
  const prodPorSetor = useMemo(() => {
    const map = {};
    prodMes.forEach(p => {
      const nome = setorMap[p.setor_id] || 'Desconhecido';
      map[nome] = (map[nome] || 0) + (p.quantidade || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [prodMes, setorMap]);

  // Estoque atual geral
  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);
  const estoqueTotal = useMemo(() => {
    let total = 0;
    Object.values(stock).forEach(byClone => {
      Object.values(byClone).forEach(byLote => {
        Object.values(byLote).forEach(qty => { total += Math.max(0, qty); });
      });
    });
    return total;
  }, [stock]);

  // Evolução dos últimos 6 meses
  const evolucao = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(mesDate, 5 - i);
      const label = format(d, 'MMM/yy', { locale: ptBR });
      const iv = { start: startOfMonth(d), end: endOfMonth(d) };
      const inIv = (dt) => { try { return isWithinInterval(parseISO(dt), iv); } catch { return false; } };
      const prod = producoes.filter(p => inIv(p.data)).reduce((s, p) => s + (p.quantidade || 0), 0);
      const perd = perdas.filter(p => inIv(p.data)).reduce((s, p) => s + (p.quantidade || 0), 0);
      const exped = movimentacoes.filter(m => m.tipo === 'expedicao' && inIv(m.data)).reduce((s, m) => s + (m.quantidade || 0), 0);
      return { label, prod, perd, exped };
    });
  }, [mesDate, producoes, perdas, movimentacoes]);

  // Meses disponíveis (últimos 24)
  const mesesDisponiveis = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) };
    });
  }, []);

  const exportarCSV = () => {
    const mesFmt = format(mesDate, 'yyyy-MM');
    const linhas = [
      ['Tipo', 'Data', 'Clone', 'Lote', 'Setor', 'Quantidade', 'Motivo/Destino'],
      ...prodMes.map(p => ['Producao', p.data || '', cloneMap[p.clone_id] || '', loteMap[p.lote_id] || '', setorMap[p.setor_id] || '', p.quantidade || 0, '']),
      ...perdasMes.map(p => ['Perda', p.data || '', cloneMap[p.clone_id] || '', loteMap[p.lote_id] || '', setorMap[p.setor_id] || '', p.quantidade || 0, p.motivo || '']),
      ...expedicoesMes.map(m => ['Expedicao', m.data || '', cloneMap[m.clone_id] || '', loteMap[m.lote_id] || '', setorMap[m.setor_origem_id] || '', m.quantidade || 0, setorMap[m.setor_destino_id] || '']),
      ...transferenciasMes.map(m => ['Transferencia', m.data || '', cloneMap[m.clone_id] || '', loteMap[m.lote_id] || '', setorMap[m.setor_origem_id] || '', m.quantidade || 0, setorMap[m.setor_destino_id] || '']),
    ];
    const csv = linhas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viveiro_relatorio_${mesFmt}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    kpi('Produção no Mês', totalProd.toLocaleString('pt-BR'), 'text-primary'),
    kpi('Perdas no Mês', totalPerdas.toLocaleString('pt-BR'), 'text-destructive'),
    kpi('Taxa de Perda', `${taxaPerda}%`, Number(taxaPerda) > 10 ? 'text-destructive' : 'text-primary'),
    kpi('Expedições', totalExpedicao.toLocaleString('pt-BR'), 'text-blue-600'),
    kpi('Transferências', totalTransf.toLocaleString('pt-BR'), 'text-amber-600'),
    kpi('Estoque Atual Total', estoqueTotal.toLocaleString('pt-BR'), 'text-primary'),
  ];

  return (
    <div>
      <PageHeader
        title="Relatório Mensal"
        description="Visão consolidada das operações do viveiro"
        action={
          <div className="flex items-center gap-2">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mesesDisponiveis.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportarCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar para Power BI
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evolução 6 meses */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Evolução — Últimos 6 Meses</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="prod" name="Produção" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="perd" name="Perdas" stroke={COLORS[4]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="exped" name="Expedição" stroke={COLORS[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Produção por Clone */}
        <Card>
          <CardHeader><CardTitle className="text-base">Produção por Clone</CardTitle></CardHeader>
          <CardContent>
            {prodPorClone.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados no mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={prodPorClone} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name="Qtd" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Produção por Setor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Produção por Setor</CardTitle></CardHeader>
          <CardContent>
            {prodPorSetor.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados no mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={prodPorSetor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {prodPorSetor.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Perdas por Clone */}
      {perdasPorClone.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Perdas por Clone</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perdasPorClone} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" name="Perdas" fill={COLORS[4]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela detalhada de produção */}
      <Card>
        <CardHeader><CardTitle className="text-base">Registros de Produção — Detalhe</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase">
                  <th className="text-left py-2 pr-4">Data</th>
                  <th className="text-left py-2 pr-4">Clone</th>
                  <th className="text-left py-2 pr-4">Lote</th>
                  <th className="text-left py-2 pr-4">Setor</th>
                  <th className="text-right py-2">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {prodMes.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro no mês</td></tr>
                ) : prodMes.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4">{p.data ? format(parseISO(p.data), 'dd/MM/yyyy') : '—'}</td>
                    <td className="py-2 pr-4">{cloneMap[p.clone_id] || '—'}</td>
                    <td className="py-2 pr-4">{loteMap[p.lote_id] || '—'}</td>
                    <td className="py-2 pr-4">{setorMap[p.setor_id] || '—'}</td>
                    <td className="py-2 text-right font-medium">{p.quantidade?.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}