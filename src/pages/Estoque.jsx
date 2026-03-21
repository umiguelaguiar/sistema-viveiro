import React, { useMemo, useState } from 'react';
import { useClones, useProducoes, usePerdas, useMovimentacoes, useSetores, useLotes } from '@/hooks/useNurseryData';
import { calculateStock } from '@/lib/stockCalculations';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { differenceInDays, parseISO } from 'date-fns';

function IdadeBadge({ dias }) {
  if (dias == null) return <span className="text-muted-foreground text-xs">—</span>;
  const color = dias > 90 ? 'bg-green-100 text-green-700' : dias > 45 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{dias}d</span>;
}

export default function Estoque() {
  const { data: clones } = useClones();
  const { data: producoes } = useProducoes();
  const { data: perdas } = usePerdas();
  const { data: movimentacoes } = useMovimentacoes();
  const { data: setores } = useSetores();
  const { data: lotes } = useLotes();

  const [filtroClone, setFiltroClone] = useState('todos');
  const [filtroSetor, setFiltroSetor] = useState('todos');
  const [filtroLote, setFiltroLote] = useState('todos');
  const [busca, setBusca] = useState('');
  const [expanded, setExpanded] = useState(null);

  const cloneMap = useMemo(() => Object.fromEntries(clones.map(c => [c.id, c])), [clones]);
  const setorMap = useMemo(() => Object.fromEntries(setores.map(s => [s.id, s])), [setores]);
  const loteMap = useMemo(() => Object.fromEntries(lotes.map(l => [l.id, l])), [lotes]);

  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);

  // Monta linhas detalhadas: uma por (setor, clone, lote)
  const linhas = useMemo(() => {
    const result = [];
    Object.entries(stock).forEach(([setorId, byClone]) => {
      Object.entries(byClone).forEach(([cloneId, byLote]) => {
        Object.entries(byLote).forEach(([loteId, qty]) => {
          if (qty <= 0) return;
          const setor = setorMap[setorId];
          const clone = cloneMap[cloneId];
          const lote = loteMap[loteId];

          // Histórico de movimentações para este clone+lote
          const historico = [
            ...producoes.filter(p => p.clone_id === cloneId && p.lote_id === loteId && p.setor_id === setorId)
              .map(p => ({ data: p.data, tipo: 'Produção', qty: p.quantidade, de: null, para: setorMap[p.setor_id]?.nome })),
            ...movimentacoes.filter(m => m.clone_id === cloneId && m.lote_id === loteId)
              .map(m => ({ data: m.data, tipo: m.tipo === 'transferencia' ? 'Transferência' : 'Expedição', qty: m.quantidade, de: setorMap[m.setor_origem_id]?.nome, para: setorMap[m.setor_destino_id]?.nome })),
            ...perdas.filter(p => p.clone_id === cloneId && p.lote_id === loteId && p.setor_id === setorId)
              .map(p => ({ data: p.data, tipo: 'Perda', qty: p.quantidade, motivo: p.motivo })),
          ].sort((a, b) => (b.data || '').localeCompare(a.data || ''));

          // Idade: data mais antiga de produção deste clone+lote
          const producaoInicial = producoes
            .filter(p => p.clone_id === cloneId && p.lote_id === loteId)
            .sort((a, b) => (a.data || '').localeCompare(b.data || ''))[0];
          const idade = producaoInicial?.data
            ? differenceInDays(new Date(), parseISO(producaoInicial.data))
            : null;

          result.push({ setorId, cloneId, loteId, setor, clone, lote, qty, historico, idade });
        });
      });
    });
    return result;
  }, [stock, setorMap, cloneMap, loteMap, producoes, movimentacoes, perdas]);

  const filtradas = useMemo(() => linhas.filter(l => {
    if (filtroClone !== 'todos' && l.cloneId !== filtroClone) return false;
    if (filtroSetor !== 'todos' && l.setorId !== filtroSetor) return false;
    if (filtroLote !== 'todos' && l.loteId !== filtroLote) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!l.clone?.codigo_clone?.toLowerCase().includes(q) && !l.lote?.codigo?.toLowerCase().includes(q) && !l.setor?.nome?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [linhas, filtroClone, filtroSetor, filtroLote, busca]);

  const totalFiltrado = filtradas.reduce((s, l) => s + l.qty, 0);

  // Totais por setor (filtrado)
  const totalPorSetor = useMemo(() => {
    const map = {};
    filtradas.forEach(l => {
      const nome = l.setor?.nome || 'Desconhecido';
      map[nome] = (map[nome] || 0) + l.qty;
    });
    return Object.entries(map).map(([nome, total]) => ({ nome, total }));
  }, [filtradas]);

  return (
    <div>
      <PageHeader title="Estoque" description="Rastreabilidade completa das mudas por clone, setor e lote" />

      {/* Resumo por setor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {setores.map(s => {
          const linha = totalPorSetor.find(t => t.nome === s.nome);
          return (
            <Card key={s.id} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.nome}</p>
              <p className="text-3xl font-bold text-foreground mt-1">{(linha?.total || 0).toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">mudas em estoque</p>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Buscar clone, lote, setor..." className="w-56" value={busca} onChange={e => setBusca(e.target.value)} />
        <Select value={filtroClone} onValueChange={setFiltroClone}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Clone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clones</SelectItem>
            {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroSetor} onValueChange={setFiltroSetor}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroLote} onValueChange={setFiltroLote}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Lote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os lotes</SelectItem>
            {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-3 text-sm text-muted-foreground">
        {filtradas.length} registros · <strong>{totalFiltrado.toLocaleString('pt-BR')}</strong> mudas
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lote</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantidade</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Idade</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum item em estoque</td></tr>
              ) : filtradas.map((l, i) => {
                const key = `${l.setorId}-${l.cloneId}-${l.loteId}`;
                const isExpanded = expanded === key;
                return (
                  <React.Fragment key={key}>
                    <tr className={`border-t hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}>
                      <td className="px-4 py-3 font-medium">{l.clone?.codigo_clone || '—'}</td>
                      <td className="px-4 py-3">{l.lote?.codigo || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{l.setor?.nome || '—'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary">{l.qty.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-center"><IdadeBadge dias={l.idade} /></td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : key)}
                          className="text-xs text-primary underline hover:no-underline"
                        >
                          {isExpanded ? 'Fechar' : `Ver (${l.historico.length})`}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/10">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">Histórico de Movimentação</div>
                          {l.historico.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sem histórico</p>
                          ) : (
                            <div className="space-y-1">
                              {l.historico.slice(0, 10).map((h, j) => (
                                <div key={j} className="flex items-center gap-3 text-xs bg-background rounded px-3 py-1.5">
                                  <span className="text-muted-foreground w-20 shrink-0">{h.data || '—'}</span>
                                  <Badge variant="secondary" className="text-xs shrink-0">{h.tipo}</Badge>
                                  <span className="font-medium">{h.qty?.toLocaleString('pt-BR')}</span>
                                  {h.de && <span className="text-muted-foreground">De: {h.de}</span>}
                                  {h.para && <span className="text-muted-foreground">Para: {h.para}</span>}
                                  {h.motivo && <span className="text-muted-foreground">Motivo: {h.motivo}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}