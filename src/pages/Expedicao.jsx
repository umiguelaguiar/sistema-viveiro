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
  const [form, setForm] = useState({ lote_id: '', clone_id: '', quantidade: '', data: todayLocal() });

  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);

  const expedicoes = movimentacoes.filter(m => m.tipo === 'expedicao');


  const setorExpedicao = form.clone_id && form.lote_id && form.quantidade
    ? getExpedicaoSetor(stock, setores, form.clone_id, form.lote_id, Number(form.quantidade))
    : null;

  const handleSave = async () => {
    const qty = Number(form.quantidade);
    if (!setorExpedicao) {
      toast.error('Estoque insuficiente em todos os setores para esta quantidade.');
      return;
    }
    await base44.entities.Movimentacao.create({
      ...form,
      tipo: 'expedicao',
      quantidade: qty,
      setor_origem_id: setorExpedicao.id,
      setor_destino_id: ''
    });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
    queryClient.invalidateQueries({ queryKey: ['producoes'] });
    queryClient.invalidateQueries({ queryKey: ['perdas'] });
    setForm({ lote_id: '', clone_id: '', quantidade: '', data: todayLocal() });
    setOpen(false);
    toast.success(`Expedição registrada a partir de ${setorExpedicao.nome}`);
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
    { header: 'Data', render: (row) => row.data ? format(new Date(row.data), 'dd/MM/yyyy') : '—' },
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
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Expedição</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clone</Label>
              <Select value={form.clone_id} onValueChange={v => setForm({ ...form, clone_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lote</Label>
              <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} placeholder="Ex: 500" />
            </div>
            {setorExpedicao && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">Setor de saída automático:</p>
                <Badge className="mt-1 bg-primary text-primary-foreground">{setorExpedicao.nome}</Badge>
              </div>
            )}
            {form.quantidade && form.clone_id && form.lote_id && !setorExpedicao && (
              <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive">Estoque insuficiente em todos os setores.</p>
              </div>
            )}
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.lote_id || !form.clone_id || !form.quantidade || !setorExpedicao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}