import React, { useMemo, useState, useRef } from 'react';
import { useProducoes, useMovimentacoes, usePerdas, useClones, useSetores, useLotes } from '@/hooks/useNurseryData';
import { calculateStock } from '@/lib/stockCalculations';
import PageHeader from '@/components/shared/PageHeader';
import RelatorioFiltros from '@/components/relatorio/RelatorioFiltros';
import ResumoExecutivo from '@/components/relatorio/ResumoExecutivo';
import SecaoProducao from '@/components/relatorio/SecaoProducao';
import SecaoPerdas from '@/components/relatorio/SecaoPerdas';
import SecaoEstoque from '@/components/relatorio/SecaoEstoque';
import SecaoFluxo from '@/components/relatorio/SecaoFluxo';
import SecaoExpedicao from '@/components/relatorio/SecaoExpedicao';
import SecaoEficiencia from '@/components/relatorio/SecaoEficiencia';
import SecaoAnaliseClone from '@/components/relatorio/SecaoAnaliseClone';
import SecaoPrevisoes from '@/components/relatorio/SecaoPrevisoes';
import AlertasGerenciais from '@/components/relatorio/AlertasGerenciais';
import TabelaCompleta from '@/components/relatorio/TabelaCompleta';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorio() {
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));
  const [cloneFiltro, setCloneFiltro] = useState('todos');
  const [loteFiltro, setLoteFiltro] = useState('todos');
  const [setorFiltro, setSetorFiltro] = useState('todos');
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
  const intervalo = useMemo(() => ({ start: startOfMonth(mesDate), end: endOfMonth(mesDate) }), [mesDate]);
  const inInterval = (d) => { try { return isWithinInterval(parseISO(d), intervalo); } catch { return false; } };

  // Filtros aplicados
  const applyFilters = (arr, campo_clone = 'clone_id', campo_lote = 'lote_id', campo_setor = 'setor_id') => {
    return arr.filter(r => {
      if (cloneFiltro !== 'todos' && r[campo_clone] !== cloneFiltro) return false;
      if (loteFiltro !== 'todos' && r[campo_lote] !== loteFiltro) return false;
      if (setorFiltro !== 'todos' && r[campo_setor] !== setorFiltro) return false;
      return true;
    });
  };

  const prodMes = useMemo(() => applyFilters(producoes.filter(p => inInterval(p.data))), [producoes, intervalo, cloneFiltro, loteFiltro, setorFiltro]);
  const perdasMes = useMemo(() => applyFilters(perdas.filter(p => inInterval(p.data))), [perdas, intervalo, cloneFiltro, loteFiltro, setorFiltro]);
  const expMes = useMemo(() => applyFilters(movimentacoes.filter(m => m.tipo === 'expedicao' && inInterval(m.data))), [movimentacoes, intervalo, cloneFiltro, loteFiltro, setorFiltro]);
  const transfMes = useMemo(() => applyFilters(movimentacoes.filter(m => m.tipo === 'transferencia' && inInterval(m.data))), [movimentacoes, intervalo, cloneFiltro, loteFiltro, setorFiltro]);

  const totalProd = prodMes.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalPerdas = perdasMes.reduce((s, p) => s + (p.quantidade || 0), 0);
  const totalExp = expMes.reduce((s, m) => s + (m.quantidade || 0), 0);
  const totalTransf = transfMes.reduce((s, m) => s + (m.quantidade || 0), 0);
  const taxaPerda = totalProd > 0 ? (totalPerdas / totalProd) * 100 : 0;
  const eficiencia = totalProd > 0 ? ((totalProd - totalPerdas) / totalProd) * 100 : 0;

  // Estoque
  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);
  const estoqueTotal = useMemo(() => {
    let total = 0;
    Object.values(stock).forEach(byClone => Object.values(byClone).forEach(byLote => Object.values(byLote).forEach(qty => { total += Math.max(0, qty); })));
    return total;
  }, [stock]);

  // Estoque por setor
   const estoquePorSetor = useMemo(() => {
     const map = {};
     setores.forEach(s => { map[s.id] = { nome: s.nome, total: 0 }; });
     Object.entries(stock).forEach(([setorId, byClone]) => {
       const total = Object.values(byClone).reduce((s, byLote) => s + Object.values(byLote).reduce((a, q) => a + Math.max(0, q), 0), 0);
       if (map[setorId]) map[setorId].total = total;
       else map[setorId] = { nome: setorMap[setorId] || setorId, total };
     });
     return Object.values(map);
   }, [stock, setores, setorMap]);

  // Estoque por clone
  const estoquePorClone = useMemo(() => {
    const map = {};
    Object.entries(stock).forEach(([, byClone]) => {
      Object.entries(byClone).forEach(([cloneId, byLote]) => {
        const total = Object.values(byLote).reduce((s, q) => s + Math.max(0, q), 0);
        const nome = cloneMap[cloneId] || cloneId;
        map[nome] = (map[nome] || 0) + total;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [stock, cloneMap]);

  // Produção por clone e mês anterior para comparação
  const prodMesAnt = useMemo(() => {
    const ivAnt = { start: startOfMonth(subMonths(mesDate, 1)), end: endOfMonth(subMonths(mesDate, 1)) };
    return producoes.filter(p => { try { return isWithinInterval(parseISO(p.data), ivAnt); } catch { return false; } })
      .reduce((s, p) => s + (p.quantidade || 0), 0);
  }, [producoes, mesDate]);

  // Análise por clone
  const analiseClones = useMemo(() => {
    const map = {};
    clones.forEach(c => { map[c.id] = { nome: c.codigo_clone, prod: 0, perdas: 0, exp: 0 }; });
    prodMes.forEach(p => { if (map[p.clone_id]) map[p.clone_id].prod += p.quantidade || 0; });
    perdasMes.forEach(p => { if (map[p.clone_id]) map[p.clone_id].perdas += p.quantidade || 0; });
    expMes.forEach(m => { if (map[m.clone_id]) map[m.clone_id].exp += m.quantidade || 0; });
    return Object.values(map)
      .filter(c => c.prod > 0 || c.perdas > 0)
      .map(c => ({
        ...c,
        mortalidade: c.prod > 0 ? ((c.perdas / c.prod) * 100).toFixed(1) : '0.0',
        estoque: (estoquePorClone.find(e => e.name === c.nome)?.value || 0),
      }))
      .sort((a, b) => b.prod - a.prod);
  }, [prodMes, perdasMes, expMes, clones, estoquePorClone]);

  // Evolução 6 meses
  const evolucao = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(mesDate, 5 - i);
    const iv = { start: startOfMonth(d), end: endOfMonth(d) };
    const inIv = (dt) => { try { return isWithinInterval(parseISO(dt), iv); } catch { return false; } };
    return {
      label: format(d, 'MMM/yy', { locale: ptBR }),
      prod: producoes.filter(p => inIv(p.data)).reduce((s, p) => s + (p.quantidade || 0), 0),
      perd: perdas.filter(p => inIv(p.data)).reduce((s, p) => s + (p.quantidade || 0), 0),
      exped: movimentacoes.filter(m => m.tipo === 'expedicao' && inIv(m.data)).reduce((s, m) => s + (m.quantidade || 0), 0),
    };
  }), [mesDate, producoes, perdas, movimentacoes]);

  // Média diária para previsões
  const hoje = new Date();
  const ultimos30Prod = producoes.filter(p => { try { return isWithinInterval(parseISO(p.data), { start: subDays(hoje, 30), end: hoje }); } catch { return false; } });
  const mediaDiaria = ultimos30Prod.reduce((s, p) => s + (p.quantidade || 0), 0) / 30;

  const mesesDisponiveis = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) };
  }), []);

  const exportarPDF = async () => {
    if (!contentRef.current) return;
    setExportando(true);
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      let posY = 0, remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, posY > 0 ? -(imgH - remaining) : 0, pdfW, imgH);
        remaining -= pdfH;
        if (remaining > 0) { pdf.addPage(); posY += pdfH; }
      }
      pdf.save(`viveiro_relatorio_${mes}.pdf`);
    } finally { setExportando(false); }
  };

  const data = { totalProd, totalPerdas, totalExp, totalTransf, taxaPerda, eficiencia, estoqueTotal, prodMesAnt, mediaDiaria };

  return (
    <div>
      <PageHeader
        title="Relatório Gerencial"
        description="Análise completa das operações do viveiro"
        action={
          <Button variant="outline" onClick={exportarPDF} disabled={exportando} className="gap-2">
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportando ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        }
      />

      <RelatorioFiltros
        mes={mes} setMes={setMes}
        cloneFiltro={cloneFiltro} setCloneFiltro={setCloneFiltro}
        loteFiltro={loteFiltro} setLoteFiltro={setLoteFiltro}
        setorFiltro={setorFiltro} setSetorFiltro={setSetorFiltro}
        clones={clones} lotes={lotes} setores={setores}
        mesesDisponiveis={mesesDisponiveis}
      />

      <div ref={contentRef} className="space-y-8">
        <AlertasGerenciais data={data} />
        <ResumoExecutivo data={data} mesLabel={mesesDisponiveis.find(m2 => m2.value === mes)?.label || mes} />
        <SecaoProducao prodMes={prodMes} cloneMap={cloneMap} evolucao={evolucao} />
        <SecaoPerdas perdasMes={perdasMes} cloneMap={cloneMap} setorMap={setorMap} totalProd={totalProd} />
        <SecaoEstoque estoquePorSetor={estoquePorSetor} estoquePorClone={estoquePorClone} estoqueTotal={estoqueTotal} />
        <SecaoFluxo transfMes={transfMes} expMes={expMes} setorMap={setorMap} cloneMap={cloneMap} />
        <SecaoExpedicao expMes={expMes} cloneMap={cloneMap} evolucao={evolucao} />
        <SecaoEficiencia eficiencia={eficiencia} totalProd={totalProd} totalPerdas={totalPerdas} prodMesAnt={prodMesAnt} />
        <SecaoAnaliseClone analiseClones={analiseClones} />
        <SecaoPrevisoes mediaDiaria={mediaDiaria} estoquePorSetor={estoquePorSetor} />
        <TabelaCompleta prodMes={prodMes} perdasMes={perdasMes} expMes={expMes} transfMes={transfMes} cloneMap={cloneMap} loteMap={loteMap} setorMap={setorMap} />
      </div>
    </div>
  );
}