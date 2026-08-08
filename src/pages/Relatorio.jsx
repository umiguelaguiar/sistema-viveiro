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
import { Download, Loader2, Calendar } from 'lucide-react';
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
  const [gerando, setGerando] = useState(false);
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

  // Expedições: não têm setor_id; filtrar apenas por clone e lote
  const expMes = useMemo(() => movimentacoes.filter(m => m.tipo === 'expedicao' && inInterval(m.data))
    .filter(r => {
      if (cloneFiltro !== 'todos' && r.clone_id !== cloneFiltro) return false;
      if (loteFiltro !== 'todos' && r.lote_id !== loteFiltro) return false;
      return true;
    }), [movimentacoes, intervalo, cloneFiltro, loteFiltro]);

  // Transferências: usar setor_origem_id como campo de setor
  const transfMes = useMemo(() => movimentacoes.filter(m => m.tipo === 'transferencia' && inInterval(m.data))
    .filter(r => {
      if (cloneFiltro !== 'todos' && r.clone_id !== cloneFiltro) return false;
      if (loteFiltro !== 'todos' && r.lote_id !== loteFiltro) return false;
      if (setorFiltro !== 'todos' && r.setor_origem_id !== setorFiltro) return false;
      return true;
    }), [movimentacoes, intervalo, cloneFiltro, loteFiltro, setorFiltro]);

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
    Object.entries(stock).forEach(([setorId, byClone]) => {
      const setor = setores.find(s => s.id === setorId);
      if (!setor) return; // Pula setores deletados
      const total = Object.values(byClone).reduce((s, byLote) => s + Object.values(byLote).reduce((a, q) => a + Math.max(0, q), 0), 0);
      map[setorId] = { nome: setor.nome, total };
    });
    return Object.values(map);
  }, [stock, setores]);

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
    setExportando(true);
    try {
      // Carregar logo e remover fundo branco via canvas
      let logoBase64 = null;
      try {
        const img = await new Promise((res, rej) => {
          const i = new Image();
          i.crossOrigin = 'anonymous';
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = 'https://media.base44.com/images/public/69bde243dc485779f5218ed4/f14cef072_IMG-20260225-WA0001-Editado.png';
        });
        const cnv = document.createElement('canvas');
        cnv.width = img.width; cnv.height = img.height;
        const ctx = cnv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, cnv.width, cnv.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 220 && d[i+1] > 220 && d[i+2] > 220) d[i+3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        logoBase64 = cnv.toDataURL('image/png');
      } catch {}

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = 210;
      const margin = 15;
      const contentW = pw - margin * 2;
      let y = 0;

      const cor = { verde: [39, 121, 71], cinzaEsc: [40, 40, 40], cinzaMed: [90, 90, 90], cinzaClaro: [200, 200, 200], bg: [245, 248, 245], branco: [255, 255, 255], amarelo: [180, 120, 0], vermelho: [180, 40, 40] };

      const addHeader = () => {
        pdf.setFillColor(...cor.verde);
        pdf.rect(0, 0, pw, 28, 'F');
        if (logoBase64) {
          try { pdf.addImage(logoBase64, 'JPEG', margin, 3, 22, 22); } catch {}
        }
        const textX = logoBase64 ? margin + 26 : margin;
        pdf.setTextColor(...cor.branco);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text('Viveiro Metalsider', textX, 12);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const mesLabel = mesesDisponiveis.find(m2 => m2.value === mes)?.label || mes;
        pdf.text(`Relatório Gerencial — ${mesLabel}`, textX, 19);
        pdf.setFontSize(7.5);
        pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pw - margin, 19, { align: 'right' });
      };

      addHeader();
      y = 36;

      const addPage = () => { pdf.addPage(); addHeader(); y = 36; };
      const checkY = (needed = 10) => { if (y + needed > 280) addPage(); };

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

      // --- 1. Resumo Executivo ---
      secao('Resumo Executivo');
      linha('Total Produzido', totalProd.toLocaleString('pt-BR') + ' mudas', true);
      linha('Total Perdas', totalPerdas.toLocaleString('pt-BR') + ' mudas');
      linha('Total Expedido', totalExp.toLocaleString('pt-BR') + ' mudas');
      linha('Total Transferências', totalTransf.toLocaleString('pt-BR') + ' mudas');
      linha('Taxa de Perda', taxaPerda.toFixed(1) + '%');
      linha('Eficiência Operacional', eficiencia.toFixed(1) + '%', true);
      linha('Estoque Total Atual', estoqueTotal.toLocaleString('pt-BR') + ' mudas', true);
      y += 5;

      // --- 2. Indicadores de Desempenho (KPIs) ---
      secao('Indicadores de Desempenho (KPIs)');
      const variacaoProd = prodMesAnt > 0 ? (((totalProd - prodMesAnt) / prodMesAnt) * 100).toFixed(1) : 'N/D';
      const varSinal = totalProd >= prodMesAnt ? '+' : '';
      linha('Variação de Produção vs Mês Anterior', variacaoProd !== 'N/D' ? `${varSinal}${variacaoProd}%` : 'N/D');
      linha('Média Diária de Produção (30 dias)', Math.round(mediaDiaria).toLocaleString('pt-BR') + ' mudas/dia');
      linha('Previsão Mensal (média atual)', Math.round(mediaDiaria * 22).toLocaleString('pt-BR') + ' mudas');
      linha('Previsão Anual (média atual)', Math.round(mediaDiaria * 252).toLocaleString('pt-BR') + ' mudas');
      linha('Proporção Expedido / Produzido', totalProd > 0 ? ((totalExp / totalProd) * 100).toFixed(1) + '%' : 'N/D');
      linha('Número de Clones Ativos no Período', analiseClones.length + ' clones');
      linha('Número de Setores com Estoque', estoquePorSetor.filter(s => s.total > 0).length + ' setores');
      y += 5;

      // --- 3. Análise por Clone ---
      if (analiseClones.length > 0) {
        secao('Análise de Desempenho por Clone');
        tabela(
          ['Clone', 'Produção', 'Perdas', 'Expedição', 'Mortalidade', 'Estoque'],
          analiseClones.slice(0, 20).map(c => [
            c.nome,
            c.prod.toLocaleString('pt-BR'),
            c.perdas.toLocaleString('pt-BR'),
            c.exp.toLocaleString('pt-BR'),
            c.mortalidade + '%',
            c.estoque.toLocaleString('pt-BR')
          ])
        );
      }

      // --- 4. Estoque por Setor ---
      if (estoquePorSetor.length > 0) {
        secao('Estoque por Setor');
        tabela(
          ['Setor', 'Quantidade em Estoque', '% do Total'],
          estoquePorSetor
            .filter(s => s.total > 0)
            .sort((a,b) => b.total - a.total)
            .map(s => [s.nome, s.total.toLocaleString('pt-BR'), estoqueTotal > 0 ? ((s.total/estoqueTotal)*100).toFixed(1)+'%' : '-'])
        );
      }

      // --- 5. Top 10 Clones em Estoque ---
      if (estoquePorClone.length > 0) {
        secao('Top 10 Clones em Estoque');
        tabela(
          ['Clone', 'Quantidade em Estoque', '% do Total'],
          estoquePorClone.slice(0, 10).map(c => [
            c.name,
            c.value.toLocaleString('pt-BR'),
            estoqueTotal > 0 ? ((c.value/estoqueTotal)*100).toFixed(1)+'%' : '-'
          ])
        );
      }

      // --- 6. Produção por Clone ---
      if (prodMes.length > 0) {
        secao('Produção por Clone no Período');
        const agrupado = {};
        prodMes.forEach(p => { const nome = cloneMap[p.clone_id] || p.clone_id; agrupado[nome] = (agrupado[nome] || 0) + (p.quantidade || 0); });
        tabela(
          ['Clone', 'Quantidade Produzida', '% do Total'],
          Object.entries(agrupado).sort((a,b) => b[1]-a[1]).slice(0,15).map(([nome, qty]) => [
            nome, qty.toLocaleString('pt-BR'), totalProd > 0 ? ((qty/totalProd)*100).toFixed(1)+'%' : '-'
          ])
        );
      }

      // --- 7. Perdas ---
      if (perdasMes.length > 0) {
        secao('Registros de Perdas');
        const colWidths = [22, 28, 28, 14, contentW - 22 - 28 - 28 - 14];
        checkY(10);
        const perdaHeaders = ['Data', 'Clone', 'Setor', 'Qtd', 'Motivo'];
        pdf.setFillColor(...cor.cinzaEsc);
        pdf.rect(margin, y, contentW, 7, 'F');
        pdf.setTextColor(...cor.branco);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        let xh = margin;
        perdaHeaders.forEach((h, i) => { pdf.text(h, xh + 2, y + 5); xh += colWidths[i]; });
        y += 7;
        perdasMes.slice(0, 15).forEach((p, ri) => {
          const motivo = p.motivo || '-';
          const motivoLines = pdf.splitTextToSize(motivo, colWidths[4] - 4);
          const rowH = Math.max(6, motivoLines.length * 4.5);
          checkY(rowH);
          pdf.setFillColor(ri % 2 === 0 ? 250 : 245, ri % 2 === 0 ? 250 : 248, ri % 2 === 0 ? 250 : 245);
          pdf.rect(margin, y, contentW, rowH, 'F');
          pdf.setDrawColor(...cor.cinzaClaro);
          pdf.rect(margin, y, contentW, rowH, 'S');
          pdf.setTextColor(...cor.cinzaEsc);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          const cells = [
            p.data ? format(parseISO(p.data), 'dd/MM/yyyy') : '-',
            cloneMap[p.clone_id] || '-',
            setorMap[p.setor_id] || '-',
            (p.quantidade || 0).toLocaleString('pt-BR'),
          ];
          let xc = margin;
          cells.forEach((cell, i) => { pdf.text(String(cell), xc + 2, y + 4.2); xc += colWidths[i]; });
          pdf.text(motivoLines, xc + 2, y + 4.2);
          y += rowH;
        });
        y += 3;
      }

      // --- 8. Expedições ---
      if (expMes.length > 0) {
        secao('Registros de Expedição');
        tabela(
          ['Data', 'Clone', 'Lote', 'Quantidade'],
          expMes.slice(0, 15).map(m => [
            m.data ? format(parseISO(m.data), 'dd/MM/yyyy') : '-',
            cloneMap[m.clone_id] || '-',
            loteMap[m.lote_id] || '-',
            (m.quantidade || 0).toLocaleString('pt-BR')
          ])
        );
      }

      // --- 8b. Transferências ---
      if (transfMes.length > 0) {
        secao('Registros de Transferência');
        tabela(
          ['Data', 'Clone', 'Lote', 'Origem', 'Destino', 'Qtd'],
          transfMes.slice(0, 15).map(m => [
            m.data ? format(parseISO(m.data), 'dd/MM/yyyy') : '-',
            cloneMap[m.clone_id] || '-',
            loteMap[m.lote_id] || '-',
            setorMap[m.setor_origem_id] || '-',
            setorMap[m.setor_destino_id] || '-',
            (m.quantidade || 0).toLocaleString('pt-BR')
          ])
        );
      }

      // --- 9. Evolução 6 meses ---
      secao('Evolução dos Últimos 6 Meses');
      tabela(
        ['Mês', 'Produção', 'Perdas', 'Expedição', 'Eficiência'],
        evolucao.map(e => [
          e.label,
          e.prod.toLocaleString('pt-BR'),
          e.perd.toLocaleString('pt-BR'),
          e.exped.toLocaleString('pt-BR'),
          e.prod > 0 ? (((e.prod - e.perd) / e.prod) * 100).toFixed(1) + '%' : '-'
        ])
      );

      // --- Rodapé em todas as páginas ---
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFillColor(...cor.bg);
        pdf.rect(0, 288, pw, 10, 'F');
        pdf.setTextColor(...cor.cinzaMed);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text('Viveiro Metalsider — Relatório Gerencial Confidencial', margin, 294);
        pdf.text(`Página ${i} de ${totalPages}`, pw - margin, 294, { align: 'right' });
      }

      pdf.save(`viveiro_relatorio_${mes}.pdf`);
    } finally { setExportando(false); }
  };

  const data = { totalProd, totalPerdas, totalExp, totalTransf, taxaPerda, eficiencia, estoqueTotal, prodMesAnt, mediaDiaria };

  const gerarRelatorioSemanal = async () => {
    setGerando(true);
    try {
      const hoje = new Date();
      const primeiroDiaSemana = new Date(hoje);
      primeiroDiaSemana.setDate(hoje.getDate() - hoje.getDay());
      
      const prodSemana = producoes.filter(p => {
        try {
          const dataProducao = parseISO(p.data);
          return isWithinInterval(dataProducao, { start: primeiroDiaSemana, end: hoje });
        } catch { return false; }
      });

      const totalProdSemana = prodSemana.reduce((s, p) => s + (p.quantidade || 0), 0);
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = 210;
      const margin = 15;
      const contentW = pw - margin * 2;
      let y = 0;

      const cor = { verde: [39, 121, 71], cinzaEsc: [40, 40, 40], cinzaMed: [90, 90, 90], cinzaClaro: [200, 200, 200], bg: [245, 248, 245], branco: [255, 255, 255] };

      // Header
      pdf.setFillColor(...cor.verde);
      pdf.rect(0, 0, pw, 28, 'F');
      pdf.setTextColor(...cor.branco);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Viveiro Metalsider', margin, 12);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Relatório de Produção Semanal`, margin, 19);
      pdf.setFontSize(8);
      pdf.text(`${format(primeiroDiaSemana, 'dd/MM/yyyy')} a ${format(hoje, 'dd/MM/yyyy')}`, margin, 24);

      y = 36;

      // Resumo
      pdf.setFillColor(...cor.verde);
      pdf.rect(margin, y, contentW, 7, 'F');
      pdf.setTextColor(...cor.branco);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('RESUMO DA SEMANA', margin + 3, y + 5);
      y += 10;

      pdf.setFillColor(245, 248, 245);
      pdf.rect(margin, y, contentW, 6, 'F');
      pdf.setDrawColor(...cor.cinzaClaro);
      pdf.rect(margin, y, contentW, 6, 'S');
      pdf.setTextColor(...cor.cinzaEsc);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text('Total Produzido na Semana', margin + 3, y + 4.2);
      pdf.setFont('helvetica', 'bold');
      pdf.text(totalProdSemana.toLocaleString('pt-BR') + ' mudas', pw - margin - 3, y + 4.2, { align: 'right' });
      y += 8;

      // Tabela de produções agrupadas por clone
      if (prodSemana.length > 0) {
        pdf.setFillColor(...cor.verde);
        pdf.rect(margin, y, contentW, 7, 'F');
        pdf.setTextColor(...cor.branco);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text('PRODUÇÃO POR CLONE', margin + 3, y + 5);
        y += 10;

        // Agrupar por clone
        const porClone = {};
        prodSemana.forEach(p => {
          const nome = cloneMap[p.clone_id] || p.clone_id || '-';
          porClone[nome] = (porClone[nome] || 0) + (p.quantidade || 0);
        });
        const linhasClone = Object.entries(porClone).sort((a, b) => b[1] - a[1]);

        const col1 = contentW * 0.6;
        const col2 = contentW * 0.4;

        pdf.setFillColor(...cor.cinzaEsc);
        pdf.rect(margin, y, contentW, 7, 'F');
        pdf.setTextColor(...cor.branco);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('Clone', margin + 2, y + 5);
        pdf.text('Quantidade', margin + col1 + 2, y + 5);
        y += 7;

        linhasClone.forEach(([nome, qty], idx) => {
          pdf.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 250 : 248, idx % 2 === 0 ? 250 : 245);
          pdf.rect(margin, y, contentW, 6, 'F');
          pdf.setDrawColor(...cor.cinzaClaro);
          pdf.rect(margin, y, contentW, 6, 'S');
          pdf.setTextColor(...cor.cinzaEsc);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.text(nome, margin + 2, y + 4.2);
          pdf.text(qty.toLocaleString('pt-BR'), margin + col1 + 2, y + 4.2);
          y += 6;
        });
      }

      // Helpers de paginação
      const checkY = (needed = 10) => {
        if (y + needed > 280) { pdf.addPage(); y = 12; }
      };
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

      // --- Estoque atual por setor (com separação por clone) ---
      if (estoquePorSetor.length > 0) {
        secao('Estoque Atual por Setor');
        const setoresComEstoque = estoquePorSetor
          .filter(s => s.total > 0)
          .sort((a, b) => b.total - a.total);

        setoresComEstoque.forEach(setor => {
          // Localiza o ID do setor pelo nome
          const setorId = Object.keys(stock).find(sid => setores.find(s => s.id === sid)?.nome === setor.nome);
          const setorStock = setorId ? (stock[setorId] || {}) : {};

          // Linha do setor (total)
          checkY(8);
          pdf.setFillColor(...cor.cinzaEsc);
          pdf.rect(margin, y, contentW, 6, 'F');
          pdf.setTextColor(...cor.branco);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.text(setor.nome, margin + 2, y + 4.2);
          pdf.text(setor.total.toLocaleString('pt-BR') + ' mudas', pw - margin - 3, y + 4.2, { align: 'right' });
          y += 6;

          // Breakdown por clone dentro do setor
          const porClone = Object.entries(setorStock).map(([cloneId, byLote]) => ({
            nome: cloneMap[cloneId] || cloneId,
            qtd: Object.values(byLote).reduce((a, q) => a + Math.max(0, q), 0)
          })).filter(c => c.qtd > 0).sort((a, b) => b.qtd - a.qtd);

          porClone.forEach((c, idx) => {
            checkY(5);
            pdf.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 250 : 248, idx % 2 === 0 ? 250 : 245);
            pdf.rect(margin, y, contentW, 5, 'F');
            pdf.setDrawColor(...cor.cinzaClaro);
            pdf.rect(margin, y, contentW, 5, 'S');
            pdf.setTextColor(...cor.cinzaEsc);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7.5);
            pdf.text('  ' + c.nome, margin + 2, y + 3.7);
            pdf.text(c.qtd.toLocaleString('pt-BR'), pw - margin - 3, y + 3.7, { align: 'right' });
            y += 5;
          });
          y += 2;
        });
      }

      // --- Previsão de Produção - Próximos 6 meses (por clone) ---
      secao('Previsão de Produção - Até Fev/2027');

      // Distribuição percentual por clone baseada nos últimos 6 meses
      const inicio6meses = subMonths(hoje, 6);
      const ultimos6meses = producoes.filter(p => {
        try { return isWithinInterval(parseISO(p.data), { start: inicio6meses, end: hoje }); } catch { return false; }
      });
      const porCloneAvg = {};
      ultimos6meses.forEach(p => {
        const nome = cloneMap[p.clone_id] || p.clone_id;
        if (!porCloneAvg[nome]) porCloneAvg[nome] = 0;
        porCloneAvg[nome] += (p.quantidade || 0);
      });
      const totalReal6meses = Object.values(porCloneAvg).reduce((s, v) => s + v, 0);
      // Meta: 150.000 em agosto, 170.000 a partir de setembro
      const META_AGO = 150000;
      const META_SET = 170000;
      const previsaoPorClone = Object.entries(porCloneAvg)
        .map(([nome, total]) => ({
          nome,
          percentual: totalReal6meses > 0 ? (total / totalReal6meses) * 100 : 0,
          mensal: Math.round((total / (totalReal6meses || 1)) * META_AGO),
          mensalSet: Math.round((total / (totalReal6meses || 1)) * META_SET),
        }))
        .filter(c => c.mensal > 0)
        .sort((a, b) => b.mensal - a.mensal);

      const totalMensalPrevisto = META_AGO;

      // Previsão até fevereiro/2027 — começa a partir do próximo mês (o atual já está em andamento)
      const mesFinal = new Date(2027, 1, 1); // Fevereiro/2027
      const mesInicial = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1); // Próximo mês
      const numMeses = Math.max(1, (mesFinal.getFullYear() - mesInicial.getFullYear()) * 12 + (mesFinal.getMonth() - mesInicial.getMonth()) + 1);
      const mesesFuturos = Array.from({ length: numMeses }, (_, i) => {
        const d = new Date(mesInicial.getFullYear(), mesInicial.getMonth() + i, 1);
        return format(d, 'MMM/yy', { locale: ptBR });
      });

      const colCloneW = contentW * 0.28;
      const colMesW = (contentW - colCloneW) / numMeses;

      // Cabeçalho
      checkY(10);
      pdf.setFillColor(...cor.cinzaEsc);
      pdf.rect(margin, y, contentW, 7, 'F');
      pdf.setTextColor(...cor.branco);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('Clone', margin + 2, y + 5);
      mesesFuturos.forEach((mLabel, i) => {
        pdf.text(mLabel, margin + colCloneW + colMesW * i + 1, y + 5);
      });
      y += 7;

      previsaoPorClone.slice(0, 15).forEach((c, idx) => {
        checkY(6);
        pdf.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 250 : 248, idx % 2 === 0 ? 250 : 245);
        pdf.rect(margin, y, contentW, 6, 'F');
        pdf.setDrawColor(...cor.cinzaClaro);
        pdf.rect(margin, y, contentW, 6, 'S');
        pdf.setTextColor(...cor.cinzaEsc);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text(c.nome, margin + 2, y + 4.2);
        mesesFuturos.forEach((_, i) => {
          pdf.text(c.mensalSet.toLocaleString('pt-BR'), margin + colCloneW + colMesW * i + 1, y + 4.2);
        });
        y += 6;
      });

      // Linha de total mensal previsto
      checkY(8);
      pdf.setFillColor(...cor.verde);
      pdf.rect(margin, y, contentW, 7, 'F');
      pdf.setTextColor(...cor.branco);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('TOTAL MENSAL PREVISTO', margin + 2, y + 5);
      pdf.text(`${META_SET.toLocaleString('pt-BR')} mudas/mês`, pw - margin - 3, y + 5, { align: 'right' });
      y += 10;

      // Resumo da previsão
      checkY(8);
      pdf.setFillColor(245, 248, 245);
      pdf.rect(margin, y, contentW, 6, 'F');
      pdf.setDrawColor(...cor.cinzaClaro);
      pdf.rect(margin, y, contentW, 6, 'S');
      pdf.setTextColor(...cor.cinzaEsc);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(`Previsão: ${META_SET.toLocaleString('pt-BR')} mudas/mês — distribuídas pela % real dos últimos 6 meses`, margin + 3, y + 4.2);
      y += 8;

      // --- Previsão de Estoque Total até Jan/2027 ---
      // Média mensal de perdas e expedição nos últimos 6 meses
      const perdas6m = perdas.filter(p => {
        try { return isWithinInterval(parseISO(p.data), { start: inicio6meses, end: hoje }); } catch { return false; }
      });
      const exped6m = movimentacoes.filter(m => {
        if (m.tipo !== 'expedicao') return false;
        try { return isWithinInterval(parseISO(m.data), { start: inicio6meses, end: hoje }); } catch { return false; }
      });
      const mediaMensalPerdas = perdas6m.reduce((s, p) => s + (p.quantidade || 0), 0) / 6;

      secao('Previsão de Estoque Total - Até Fev/2027');

      const colW = [contentW * 0.20, contentW * 0.25, contentW * 0.25, contentW * 0.30];

      // Cabeçalho
      checkY(10);
      pdf.setFillColor(...cor.cinzaEsc);
      pdf.rect(margin, y, contentW, 7, 'F');
      pdf.setTextColor(...cor.branco);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      let xh = margin;
      ['Mês', 'Produção', 'Perdas', 'Estoque Proj.'].forEach((h, i) => {
        pdf.text(h, xh + 2, y + 5);
        xh += colW[i];
      });
      y += 7;

      // Produção/perdas/expedição reais do mês corrente (até hoje)
      const inicioMesAtual = startOfMonth(hoje);
      const inMesAtual = (dt) => { try { return isWithinInterval(parseISO(dt), { start: inicioMesAtual, end: hoje }); } catch { return false; } };
      const prodMesAtualReal = producoes.filter(p => inMesAtual(p.data)).reduce((s, p) => s + (p.quantidade || 0), 0);
      const perdasMesAtualReal = perdas.filter(p => inMesAtual(p.data)).reduce((s, p) => s + (p.quantidade || 0), 0);
      const expedMesAtualReal = movimentacoes.filter(m => m.tipo === 'expedicao' && inMesAtual(m.data)).reduce((s, m) => s + (m.quantidade || 0), 0);

      // Estoque no início do mês corrente (remove o que já entrou/saiu neste mês)
      const estoqueInicioMes = estoqueTotal - prodMesAtualReal + perdasMesAtualReal + expedMesAtualReal;

      // Linha de estoque inicial (início do mês corrente)
      checkY(6);
      pdf.setFillColor(...cor.verde);
      pdf.rect(margin, y, contentW, 6, 'F');
      pdf.setTextColor(...cor.branco);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text('Estoque Inicial', margin + 2, y + 4.2);
      pdf.text(estoqueInicioMes.toLocaleString('pt-BR') + ' mudas', margin + colW[0] + colW[1] + colW[2] + 2, y + 4.2);
      y += 6;

      // Projeção mês a mês — mês corrente usa produção real, meses futuros usam previsão
      const perdasMes = Math.round(mediaMensalPerdas);
      let estoqueProj = estoqueInicioMes;
      const mesAtualLabel = format(hoje, 'MMM/yy', { locale: ptBR });

      // Mês corrente (produção real lançada)
      const saidasMesAtual = perdasMesAtualReal + expedMesAtualReal;
      estoqueProj += prodMesAtualReal - saidasMesAtual;
      if (estoqueProj < 0) estoqueProj = 0;
      checkY(6);
      pdf.setFillColor(255, 248, 240);
      pdf.rect(margin, y, contentW, 6, 'F');
      pdf.setDrawColor(...cor.cinzaClaro);
      pdf.rect(margin, y, contentW, 6, 'S');
      pdf.setTextColor(...cor.cinzaEsc);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      let xcAtual = margin;
      pdf.text(mesAtualLabel + ' (real)', xcAtual + 2, y + 4.2); xcAtual += colW[0];
      pdf.text('+' + prodMesAtualReal.toLocaleString('pt-BR'), xcAtual + 2, y + 4.2); xcAtual += colW[1];
      pdf.text('-' + saidasMesAtual.toLocaleString('pt-BR'), xcAtual + 2, y + 4.2); xcAtual += colW[2];
      pdf.setFont('helvetica', 'bold');
      pdf.text(estoqueProj.toLocaleString('pt-BR'), xcAtual + 2, y + 4.2);
      y += 6;

      // Meses futuros (previsão)
      mesesFuturos.forEach((mLabel, idx) => {
        const producaoMes = META_SET;
        estoqueProj += producaoMes - perdasMes;
        if (estoqueProj < 0) estoqueProj = 0;
        checkY(6);
        pdf.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 250 : 248, idx % 2 === 0 ? 250 : 245);
        pdf.rect(margin, y, contentW, 6, 'F');
        pdf.setDrawColor(...cor.cinzaClaro);
        pdf.rect(margin, y, contentW, 6, 'S');
        pdf.setTextColor(...cor.cinzaEsc);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        let xc = margin;
        pdf.text(mLabel, xc + 2, y + 4.2); xc += colW[0];
        pdf.text('+' + producaoMes.toLocaleString('pt-BR'), xc + 2, y + 4.2); xc += colW[1];
        pdf.text('-' + perdasMes.toLocaleString('pt-BR'), xc + 2, y + 4.2); xc += colW[2];
        pdf.setFont('helvetica', 'bold');
        pdf.text(estoqueProj.toLocaleString('pt-BR'), xc + 2, y + 4.2);
        y += 6;
      });

      // Rodapé da seção
      checkY(8);
      pdf.setFillColor(245, 248, 245);
      pdf.rect(margin, y, contentW, 6, 'F');
      pdf.setDrawColor(...cor.cinzaClaro);
      pdf.rect(margin, y, contentW, 6, 'S');
      pdf.setTextColor(...cor.cinzaEsc);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Estoque inicial: ${estoqueInicioMes.toLocaleString('pt-BR')} | Mês corrente: produção real | Meses futuros: ${META_SET.toLocaleString('pt-BR')} mudas/mês - ${perdasMes.toLocaleString('pt-BR')} perdas estimadas`, margin + 2, y + 4.2);
      y += 8;

      // Rodapé
      pdf.setFillColor(...cor.bg);
      pdf.rect(0, 288, pw, 10, 'F');
      pdf.setTextColor(...cor.cinzaMed);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text('Viveiro Metalsider — Relatório Semanal', margin, 294);
      pdf.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pw - margin, 294, { align: 'right' });

      pdf.save(`viveiro_relatorio_semanal_${format(hoje, 'yyyy-MM-dd')}.pdf`);
    } finally { setGerando(false); }
  };

  return (
    <div>
      <PageHeader
        title="Relatório Gerencial"
        description="Análise completa das operações do viveiro"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={gerarRelatorioSemanal} disabled={gerando} className="gap-2">
              {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {gerando ? 'Gerando...' : 'Relatório Semanal'}
            </Button>
            <Button variant="outline" onClick={exportarPDF} disabled={exportando} className="gap-2">
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportando ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
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