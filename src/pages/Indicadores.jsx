import React, { useMemo, useState, useRef } from 'react';
import { useMovimentacoes, useSetores, useClones, usePerdas, useLotes } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#15803d', '#d97706', '#2563eb', '#9333ea', '#dc2626', '#0891b2', '#c026d3', '#65a30d', '#ea580c', '#4f46e5'];

function calcTaxa(numerador, denominador) {
  if (!denominador || denominador === 0) return 0;
  return parseFloat(((numerador / denominador) * 100).toFixed(1));
}

function classificar(valor, thresholds) {
  if (valor >= thresholds[1]) return 'Ótimo';
  if (valor >= thresholds[0]) return 'Médio';
  return 'Ruim';
}

const STATUS_COLORS = {
  Ótimo: { card: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', text: 'text-green-700' },
  Médio: { card: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700' },
  Ruim: { card: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', text: 'text-red-700' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Ruim;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>{status}</span>;
}

function avg(arr) {
  if (!arr.length) return 0;
  return parseFloat((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1));
}

export default function Indicadores() {
  const { data: movimentacoes = [] } = useMovimentacoes();
  const { data: setores = [] } = useSetores();
  const { data: clones = [] } = useClones();
  const { data: perdas = [] } = usePerdas();
  const { data: lotes = [] } = useLotes();
  const [anoFiltro, setAnoFiltro] = useState('todos');
  const [mesFiltro, setMesFiltro] = useState('todos');
  const [cloneFiltro, setCloneFiltro] = useState('todos');
  const [loteFiltro, setLoteFiltro] = useState('todos');

  const loteMap = useMemo(() => Object.fromEntries(lotes.map(l => [l.id, l])), [lotes]);
  const cloneMap = useMemo(() => Object.fromEntries(clones.map(c => [c.id, c])), [clones]);

  const transferEnraizamento = useMemo(() => {
    const transfs = movimentacoes.filter(m => {
      if (m.tipo !== 'transferencia') return false;
      const origemNome = setores.find(s => s.id === m.setor_origem_id)?.nome?.toLowerCase() || '';
      const destinoNome = setores.find(s => s.id === m.setor_destino_id)?.nome?.toLowerCase() || '';
      return origemNome.includes('sombra') && destinoNome.includes('rustif');
    });

    return transfs.map(t => {
      const perdaAssoc = perdas.find(p =>
        p.lote_id === t.lote_id && p.clone_id === t.clone_id &&
        p.setor_id === t.setor_destino_id && p.data === t.data &&
        p.motivo?.includes('Descarte no enraizamento')
      );
      const descartadas = perdaAssoc?.quantidade || 0;
      const transferidas = t.quantidade;
      const enraizadas = transferidas - descartadas;
      // % Enraizamento = (transferidas - descartadas) / transferidas
      const taxa_enraizamento = calcTaxa(transferidas - descartadas, transferidas);
      return {
        ...t,
        lote: loteMap[t.lote_id],
        clone: cloneMap[t.clone_id],
        descartadas,
        enraizadas,
        transferidas,
        taxa_enraizamento,
        status_enraizamento: classificar(taxa_enraizamento, [60, 80]),
      };
    });
  }, [movimentacoes, setores, perdas, loteMap, cloneMap]);

  const anosOptions = useMemo(() => {
    const anos = new Set(transferEnraizamento.filter(t => t.data).map(t => t.data.substring(0, 4)));
    return Array.from(anos).sort().reverse();
  }, [transferEnraizamento]);

  const transferFiltradas = useMemo(() => transferEnraizamento.filter(t => {
    if (anoFiltro !== 'todos' && !t.data?.startsWith(anoFiltro)) return false;
    if (mesFiltro !== 'todos' && t.data?.substring(0, 7) !== mesFiltro) return false;
    if (cloneFiltro !== 'todos' && t.clone_id !== cloneFiltro) return false;
    if (loteFiltro !== 'todos' && t.lote_id !== loteFiltro) return false;
    return true;
  }), [transferEnraizamento, anoFiltro, mesFiltro, cloneFiltro, loteFiltro]);

  const mesesOptions = useMemo(() => {
    const meses = new Set(transferEnraizamento.filter(t => t.data).map(t => t.data.substring(0, 7)));
    return Array.from(meses).sort().reverse();
  }, [transferEnraizamento]);

  const clonesOptions = useMemo(() => {
    const ids = new Set(transferEnraizamento.map(t => t.clone_id).filter(Boolean));
    return Array.from(ids).map(id => ({ id, label: cloneMap[id]?.codigo_clone || id }));
  }, [transferEnraizamento, cloneMap]);

  const lotesOptions = useMemo(() => {
    const ids = new Set(transferEnraizamento.map(t => t.lote_id).filter(Boolean));
    return Array.from(ids).map(id => ({ id, label: loteMap[id]?.codigo || id }));
  }, [transferEnraizamento, loteMap]);

  const mediaEnraiz = avg(transferFiltradas.map(t => t.taxa_enraizamento));
  const [exportando, setExportando] = useState(false);
  const graficoRef = useRef(null);

  // Dados para o gráfico: evolução do enraizamento por clone ao longo do tempo
  const dadosGrafico = useMemo(() => {
    // Agrupar por data e clone
    const porDataClone = {};
    transferFiltradas.forEach(t => {
      if (!t.data) return;
      if (!porDataClone[t.data]) porDataClone[t.data] = {};
      const cloneNome = t.clone?.codigo_clone || t.clone_id;
      if (!porDataClone[t.data][cloneNome]) porDataClone[t.data][cloneNome] = [];
      porDataClone[t.data][cloneNome].push(t.taxa_enraizamento);
    });

    // Ordenar datas e montar array
    const datasOrdenadas = Object.keys(porDataClone).sort();
    return datasOrdenadas.map(data => {
      const ponto = { data: format(parseISO(data), 'dd/MM/yy', { locale: ptBR }) };
      Object.entries(porDataClone[data]).forEach(([clone, taxas]) => {
        ponto[clone] = avg(taxas);
      });
      return ponto;
    });
  }, [transferFiltradas]);

  // Agrupar por clone para o PDF
  const dadosPorClone = useMemo(() => {
    const map = {};
    transferFiltradas.forEach(t => {
      const id = t.clone_id || 'sem_clone';
      const nome = t.clone?.codigo_clone || id;
      if (!map[id]) map[id] = { nome, transferencias: [], transferidas: 0, descartadas: 0, enraizadas: 0, taxas: [] };
      map[id].transferencias.push(t);
      map[id].transferidas += t.transferidas;
      map[id].descartadas += t.descartadas;
      map[id].enraizadas += t.enraizadas;
      map[id].taxas.push(t.taxa_enraizamento);
    });
    return Object.values(map).map(c => ({
      ...c,
      taxa_media: avg(c.taxas),
      status: classificar(avg(c.taxas), [60, 80]),
    })).sort((a, b) => b.transferidas - a.transferidas);
  }, [transferFiltradas]);

  const exportarPDF = async () => {
    setExportando(true);
    try {
      // Capturar gráfico da tela
      let graficoImg = null;
      if (graficoRef.current) {
        try {
          const canvas = await html2canvas(graficoRef.current, { scale: 2, backgroundColor: '#ffffff' });
          graficoImg = canvas.toDataURL('image/png');
        } catch {}
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = 210;
      const margin = 15;
      const contentW = pw - margin * 2;
      let y = 0;

      const cor = { verde: [39, 121, 71], cinzaEsc: [40, 40, 40], cinzaMed: [90, 90, 90], cinzaClaro: [200, 200, 200], bg: [245, 248, 245], branco: [255, 255, 255] };

      const checkY = (needed = 10) => { if (y + needed > 280) { pdf.addPage(); y = 12; } };

      const secao = (titulo) => {
        checkY(14);
        pdf.setFillColor(...cor.verde);
        pdf.rect(margin, y, contentW, 7, 'F');
        pdf.setTextColor(...cor.branco);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(titulo.toUpperCase(), margin + 3, y + 5);
        y += 10;
      };

      const linha = (label, valor, destaque = false) => {
        checkY(7);
        pdf.setFillColor(destaque ? 242 : 255, destaque ? 248 : 255, destaque ? 242 : 255);
        pdf.rect(margin, y, contentW, 6, 'F');
        pdf.setDrawColor(...cor.cinzaClaro);
        pdf.rect(margin, y, contentW, 6, 'S');
        pdf.setTextColor(...cor.cinzaEsc);
        pdf.setFont('helvetica', destaque ? 'bold' : 'normal');
        pdf.setFontSize(8.5);
        pdf.text(label, margin + 3, y + 4.2);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(valor), pw - margin - 3, y + 4.2, { align: 'right' });
        y += 6;
      };

      const tabela = (headers, rows) => {
        checkY(10);
        const colW = contentW / headers.length;
        pdf.setFillColor(...cor.cinzaEsc);
        pdf.rect(margin, y, contentW, 7, 'F');
        pdf.setTextColor(...cor.branco);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        headers.forEach((h, i) => pdf.text(h, margin + colW * i + 2, y + 5));
        y += 7;
        rows.forEach((row, ri) => {
          checkY(6);
          pdf.setFillColor(ri % 2 === 0 ? 250 : 245, ri % 2 === 0 ? 250 : 248, ri % 2 === 0 ? 250 : 245);
          pdf.rect(margin, y, contentW, 6, 'F');
          pdf.setDrawColor(...cor.cinzaClaro);
          pdf.rect(margin, y, contentW, 6, 'S');
          pdf.setTextColor(...cor.cinzaEsc);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          row.forEach((cell, ci) => pdf.text(String(cell ?? '-'), margin + colW * ci + 2, y + 4.2));
          y += 6;
        });
        y += 3;
      };

      // Header
      pdf.setFillColor(...cor.verde);
      pdf.rect(0, 0, pw, 28, 'F');
      pdf.setTextColor(...cor.branco);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Viveiro Metalsider', margin, 12);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Indicadores de Produção por Clone', margin, 19);
      pdf.setFontSize(8);
      const periodo = [
        anoFiltro !== 'todos' ? anoFiltro : null,
        mesFiltro !== 'todos' ? format(new Date(mesFiltro + '-15'), 'MMMM/yyyy', { locale: ptBR }) : null,
      ].filter(Boolean).join(' — ') || 'Todos os períodos';
      pdf.text(`Período: ${periodo}`, margin, 24);
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pw - margin, 24, { align: 'right' });
      y = 36;

      // Resumo geral
      secao('Resumo Geral');
      linha('Total de Clones', dadosPorClone.length + ' clones', true);
      linha('Total Transferências', transferFiltradas.length + ' transferências');
      linha('Total Transferidas', transferFiltradas.reduce((s, t) => s + t.transferidas, 0).toLocaleString('pt-BR') + ' mudas');
      linha('Total Descartadas', transferFiltradas.reduce((s, t) => s + t.descartadas, 0).toLocaleString('pt-BR') + ' mudas');
      linha('Total Enraizadas', transferFiltradas.reduce((s, t) => s + t.enraizadas, 0).toLocaleString('pt-BR') + ' mudas');
      linha('Média Geral de Enraizamento', mediaEnraiz + '%', true);
      y += 5;

      // Gráfico de evolução
      if (graficoImg) {
        secao('Evolução do Enraizamento por Clone');
        const imgW = contentW;
        const imgH = imgW * 0.45;
        checkY(imgH + 5);
        try { pdf.addImage(graficoImg, 'PNG', margin, y, imgW, imgH); } catch {}
        y += imgH + 5;
      }

      // Tabela consolidada por clone
      if (dadosPorClone.length > 0) {
        secao('Consolidado por Clone');
        tabela(
          ['Clone', 'Transferências', 'Transferidas', 'Descartadas', 'Enraizadas', '% Enraiz.', 'Status'],
          dadosPorClone.map(c => [
            c.nome,
            c.transferencias.length,
            c.transferidas.toLocaleString('pt-BR'),
            c.descartadas.toLocaleString('pt-BR'),
            c.enraizadas.toLocaleString('pt-BR'),
            c.taxa_media + '%',
            c.status,
          ])
        );
      }

      // Detalhamento por clone
      dadosPorClone.forEach(clone => {
        secao(`Clone: ${clone.nome}`);
        linha('Transferências', clone.transferencias.length);
        linha('Total Transferidas', clone.transferidas.toLocaleString('pt-BR'));
        linha('Total Descartadas', clone.descartadas.toLocaleString('pt-BR'));
        linha('Total Enraizadas', clone.enraizadas.toLocaleString('pt-BR'));
        linha('Taxa Média de Enraizamento', clone.taxa_media + '%', true);
        linha('Status', clone.status, true);
        y += 3;

        tabela(
          ['Data', 'Lote', 'Transferidas', 'Descartadas', 'Enraizadas', '% Enraiz.', 'Status'],
          clone.transferencias.map(t => [
            t.data ? t.data.split('-').reverse().join('/') : '-',
            t.lote?.codigo || '-',
            t.transferidas.toLocaleString('pt-BR'),
            t.descartadas.toLocaleString('pt-BR'),
            t.enraizadas.toLocaleString('pt-BR'),
            t.taxa_enraizamento + '%',
            t.status_enraizamento,
          ])
        );
      });

      // Rodapé em todas as páginas
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFillColor(...cor.bg);
        pdf.rect(0, 288, pw, 10, 'F');
        pdf.setTextColor(...cor.cinzaMed);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text('Viveiro Metalsider — Indicadores por Clone', margin, 294);
        pdf.text(`Página ${i} de ${totalPages}`, pw - margin, 294, { align: 'right' });
      }

      pdf.save(`viveiro_indicadores_por_clone_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } finally { setExportando(false); }
  };

  const KpiCard = ({ label, valor, thresholds }) => {
    const status = classificar(valor, thresholds);
    const c = STATUS_COLORS[status];
    return (
      <Card className={`p-5 border ${c.card}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
        <p className={`text-4xl font-bold ${c.text}`}>{valor}%</p>
        <div className="mt-2"><StatusBadge status={status} /></div>
        <p className="text-xs text-muted-foreground mt-1">{transferFiltradas.length} transferências</p>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicadores de Produção"
        description="Análise por transferência (Casa de Sombra → Rustificação)"
        action={
          <Button variant="outline" onClick={exportarPDF} disabled={exportando} className="gap-2">
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportando ? 'Gerando...' : 'Exportar PDF por Clone'}
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={anoFiltro} onValueChange={v => { setAnoFiltro(v); setMesFiltro('todos'); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os anos</SelectItem>
            {anosOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mesFiltro} onValueChange={setMesFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {mesesOptions.map(m => {
              const [ano, mes] = m.split('-');
              const nome = new Date(Number(ano), Number(mes) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
              return <SelectItem key={m} value={m}>{nome.charAt(0).toUpperCase() + nome.slice(1)}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Select value={cloneFiltro} onValueChange={setCloneFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por clone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clones</SelectItem>
            {clonesOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={loteFiltro} onValueChange={setLoteFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por lote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os lotes</SelectItem>
            {lotesOptions.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Média Enraizamento" valor={mediaEnraiz} thresholds={[60, 80]} />
        <Card className="p-5 border bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total Transferências</p>
          <p className="text-4xl font-bold">{transferFiltradas.length}</p>
        </Card>
        <Card className="p-5 border bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total Descartadas</p>
          <p className="text-4xl font-bold text-red-600">{transferFiltradas.reduce((s, t) => s + t.descartadas, 0).toLocaleString('pt-BR')}</p>
        </Card>
      </div>

      {/* Gráfico de evolução por clone */}
      {dadosGrafico.length > 0 && (
        <div ref={graficoRef}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">Evolução do Enraizamento por Clone</h3>
          <p className="text-sm text-muted-foreground mb-4">Taxa de enraizamento (%) ao longo do tempo</p>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dadosGrafico} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                formatter={(v) => [v + '%', '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {dadosPorClone.map((c, i) => (
                <Line
                  key={c.nome}
                  type="monotone"
                  dataKey={c.nome}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
        </div>
      )}

      {/* Tabela */}
      {transferFiltradas.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Nenhuma transferência de Casa de Sombra → Rustificação encontrada.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lote</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clone</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transferidas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descartadas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizadas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">% Enraizamento</th>
                </tr>
              </thead>
              <tbody>
                {transferFiltradas.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{row.data ? row.data.split('-').reverse().join('/') : '—'}</td>
                    <td className="px-4 py-3 font-semibold">{row.lote?.codigo || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.clone?.codigo_clone || '—'}</td>
                    <td className="px-4 py-3 text-right">{row.transferidas.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right text-red-600">{row.descartadas.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.enraizadas.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${STATUS_COLORS[row.status_enraizamento].text}`}>{row.taxa_enraizamento}%</span>
                        <StatusBadge status={row.status_enraizamento} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}