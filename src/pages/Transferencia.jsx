import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useMovimentacoes, useClones, useLotes, useSetores, useProducoes, usePerdas } from '@/hooks/useNurseryData';
import { calculateStock, getStockForSetorCloneLote } from '@/lib/stockCalculations';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Transferencia() {
  const { data: movimentacoes, isLoading } = useMovimentacoes();
  const { data: clones } = useClones();
  const { data: lotes } = useLotes();
  const { data: setores } = useSetores();
  const { data: producoes } = useProducoes();
  const { data: perdas } = usePerdas();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const [form, setForm] = useState({ lote_id: '', clone_id: '', quantidade: '', setor_origem_id: '', setor_destino_id: '', data: todayLocal() });

  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);

  const transferencias = movimentacoes.filter(m => m.tipo === 'transferencia');
  const filteredLotes = form.clone_id ? lotes.filter(l => l.clone_id === form.clone_id) : lotes;

  const disponivel = form.setor_origem_id && form.clone_id && form.lote_id
    ? getStockForSetorCloneLote(stock, form.setor_origem_id, form.clone_id, form.lote_id)
    : 0;

  const handleSave = async () => {
    const qty = Number(form.quantidade);
    if (qty > disponivel) {
      toast.error(`Estoque insuficiente. Disponível: ${disponivel}`);
      return;
    }
    await base44.entities.Movimentacao.create({
      ...form,
      tipo: 'transferencia',
      quantidade: qty
    });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
    queryClient.invalidateQueries({ queryKey: ['producoes'] });
    queryClient.invalidateQueries({ queryKey: ['perdas'] });
    setForm({ lote_id: '', clone_id: '', quantidade: '', setor_origem_id: '', setor_destino_id: '', data: todayLocal() });
    setOpen(false);
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
    { header: 'Origem', render: (row) => setorMap[row.setor_origem_id] || '—' },
    { header: 'Destino', render: (row) => setorMap[row.setor_destino_id] || '—' },
    { header: 'Quantidade', render: (row) => row.quantidade?.toLocaleString('pt-BR') },
  ];

  return (
    <div>
      <PageHeader
        title="Transferências"
        description="Movimentação entre setores"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Transferência
          </Button>
        }
      />
      <DataTable columns={columns} data={transferencias} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clone</Label>
              <Select value={form.clone_id} onValueChange={v => setForm({ ...form, clone_id: v, lote_id: '' })}>
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
                  {filteredLotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor Origem</Label>
              <Select value={form.setor_origem_id} onValueChange={v => setForm({ ...form, setor_origem_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor Destino</Label>
              <Select value={form.setor_destino_id} onValueChange={v => setForm({ ...form, setor_destino_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {setores.filter(s => s.id !== form.setor_origem_id).map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade {disponivel > 0 && <span className="text-muted-foreground">(Disp: {disponivel})</span>}</Label>
              <Input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} placeholder="Ex: 500" />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.lote_id || !form.clone_id || !form.quantidade || !form.setor_origem_id || !form.setor_destino_id}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}