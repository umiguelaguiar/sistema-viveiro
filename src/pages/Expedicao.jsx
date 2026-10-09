import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useMovimentacoes, useClones, useLotes, useSetores, useProducoes, usePerdas } from '@/hooks/useNurseryData';
import { calculateStock, getExpedicaoSetor } from '@/lib/stockCalculations';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Expedicao() {
  const { data: movimentacoes, isLoading } = useMovimentacoes();
  const { data: clones } = useClones();
  const { data: lotes } = useLotes();
  const { data: setores } = useSetores();
  const { data: producoes } = useProducoes();
  const { data: perdas } = usePerdas();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const [form, setForm] = useState({ clone_id: '', data: todayLocal() });
  const [lotesSelecionados, setLotesSelecionados] = useState({});

  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);

  const expedicoes = movimentacoes.filter(m => m.tipo === 'expedicao');

  const stockPorLote = useMemo(() => {
    if (!form.clone_id) return {};
    const result = {};
    Object.values(stock).forEach(cloneMap => {
      const loteMap = cloneMap?.[form.clone_id];
      if (loteMap) {
        Object.entries(loteMap).forEach(([loteId, qty]) => {
          if (qty > 0) result[loteId] = (result[loteId] || 0) + qty;
        });
      }
    });
    return result;
  }, [stock, form.clone_id]);

  const lotesComEstoque = useMemo(() => lotes.filter(l => (stockPorLote[l.id] || 0) > 0), [lotes, stockPorLote]);

  const setoresPorLote = useMemo(() => {
    const result = {};
    Object.entries(lotesSelecionados).forEach(([loteId, qty]) => {
      const q = Number(qty);
      if (q > 0) result[loteId] = getExpedicaoSetor(stock, setores, form.clone_id, loteId, q);
    });
    return result;
  }, [stock, setores, form.clone_id, lotesSelecionados]);

  const handleSave = async () => {
    const lotesComQtd = Object.entries(lotesSelecionados).filter(([, q]) => Number(q) > 0);
    if (lotesComQtd.length === 0) {
      toast.error('Selecione ao menos um lote com quantidade.');
      return;
    }
    for (const [loteId, qtyStr] of lotesComQtd) {
      const setor = getExpedicaoSetor(stock, setores, form.clone_id, loteId, Number(qtyStr));
      if (!setor) {
        const lote = lotes.find(l => l.id === loteId);
        toast.error(`Estoque insuficiente para o lote ${lote?.codigo || loteId}.`);
        return;
      }
    }
    for (const [loteId, qtyStr] of lotesComQtd) {
      const setor = getExpedicaoSetor(stock, setores, form.clone_id, loteId, Number(qtyStr));
      await base44.entities.Movimentacao.create({
        tipo: 'expedicao',
        clone_id: form.clone_id,
        lote_id: loteId,
        quantidade: Number(qtyStr),
        setor_origem_id: setor.id,
        setor_destino_id: '',
        data: form.data,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
    queryClient.invalidateQueries({ queryKey: ['producoes'] });
    queryClient.invalidateQueries({ queryKey: ['perdas'] });
    setForm({ clone_id: '', data: todayLocal() });
    setLotesSelecionados({});
    setOpen(false);
    toast.success(`${lotesComQtd.length} expedição(ões) registrada(s).`);
  };

  const handleDelete = async (id) => {
    await base44.entities.Movimentacao.delete(id);
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
    queryClient.invalidateQueries({ queryKey: ['producoes'] });
    queryClient.invalidateQueries({ queryKey: ['perdas'] });
  };

  const cloneMap = {};
  clones.forEach(c => { cloneMap[c.id] = c.codigo_clone; });
  const loteMap = {};
  lotes.forEach(l => { loteMap[l.id] = l.codigo; });
  const setorMap = {};
  setores.forEach(s => { setorMap[s.id] = s.nome; });

  const columns = [
    { header: 'Data', render: (row) => row.data ? row.data.split('-').reverse().join('/') : '—' },
    { header: 'Clone', render: (row) => cloneMap[row.clone_id] || '—' },
    { header: 'Lote', render: (row) => loteMap[row.lote_id] || '—' },
    { header: 'Setor Origem', render: (row) => setorMap[row.setor_origem_id] || '—' },
    { header: 'Quantidade', render: (row) => row.quantidade?.toLocaleString('pt-BR') },
  ];

  return (
    <div>
      <PageHeader
        title="Expedição"
        description="Saída de mudas do viveiro"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Expedição
          </Button>
        }
      />
      <DataTable columns={columns} data={expedicoes} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Expedição</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clone</Label>
              <Select value={form.clone_id} onValueChange={v => { setForm({ ...form, clone_id: v }); setLotesSelecionados({}); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.clone_id && (
              <div>
                <Label>Lotes disponíveis (selecione um ou mais)</Label>
                {lotesComEstoque.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum lote com estoque para este clone.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto border rounded-lg p-2">
                    {lotesComEstoque.map(l => {
                      const checked = lotesSelecionados[l.id] !== undefined;
                      const qty = lotesSelecionados[l.id] || '';
                      const setor = qty ? setoresPorLote[l.id] : null;
                      return (
                        <div key={l.id} className="rounded-md border p-2">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={checked} onCheckedChange={(c) => {
                              if (c) setLotesSelecionados({ ...lotesSelecionados, [l.id]: '' });
                              else {
                                const copy = { ...lotesSelecionados };
                                delete copy[l.id];
                                setLotesSelecionados(copy);
                              }
                            }} />
                            <span className="text-sm font-medium flex-1">{l.codigo}</span>
                            <Badge variant="outline" className="text-xs">Estoque: {(stockPorLote[l.id] || 0).toLocaleString('pt-BR')}</Badge>
                          </div>
                          {checked && (
                            <div className="mt-2 pl-6 space-y-1">
                              <Input type="number" value={qty} onChange={e => setLotesSelecionados({ ...lotesSelecionados, [l.id]: e.target.value })} placeholder="Quantidade" />
                              {setor && (
                                <p className="text-xs text-muted-foreground">Saída: <span className="font-medium text-primary">{setor.nome}</span></p>
                              )}
                              {qty && !setor && (
                                <p className="text-xs text-destructive">Estoque insuficiente.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.clone_id || Object.values(lotesSelecionados).every(q => !Number(q))}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}