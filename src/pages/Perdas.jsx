import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { usePerdas, useClones, useLotes, useSetores, useProducoes, useMovimentacoes } from '@/hooks/useNurseryData';
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

export default function Perdas() {
  const { data: perdas, isLoading } = usePerdas();
  const { data: clones } = useClones();
  const { data: lotes } = useLotes();
  const { data: setores } = useSetores();
  const { data: producoes } = useProducoes();
  const { data: movimentacoes } = useMovimentacoes();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lote_id: '', clone_id: '', setor_id: '', quantidade: '', motivo: '', data: new Date().toISOString().split('T')[0] });

  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);

  const filteredLotes = form.clone_id ? lotes.filter(l => l.clone_id === form.clone_id) : lotes;
  const disponivel = form.setor_id && form.clone_id && form.lote_id
    ? getStockForSetorCloneLote(stock, form.setor_id, form.clone_id, form.lote_id)
    : 0;

  const handleSave = async () => {
    const qty = Number(form.quantidade);
    if (qty > disponivel) {
      toast.error(`Estoque insuficiente. Disponível: ${disponivel}`);
      return;
    }
    await base44.entities.Perda.create({ ...form, quantidade: qty });
    queryClient.invalidateQueries({ queryKey: ['perdas'] });
    setForm({ lote_id: '', clone_id: '', setor_id: '', quantidade: '', motivo: '', data: new Date().toISOString().split('T')[0] });
    setOpen(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Perda.delete(id);
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
    { header: 'Setor', render: (row) => setorMap[row.setor_id] || '—' },
    { header: 'Quantidade', render: (row) => row.quantidade?.toLocaleString('pt-BR') },
    { header: 'Motivo', render: (row) => row.motivo || '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Perdas"
        description="Registro de mortalidade e perdas"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Perda
          </Button>
        }
      />
      <DataTable columns={columns} data={perdas} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Perda</DialogTitle></DialogHeader>
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
              <Label>Setor</Label>
              <Select value={form.setor_id} onValueChange={v => setForm({ ...form, setor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade {disponivel > 0 && <span className="text-muted-foreground">(Disp: {disponivel})</span>}</Label>
              <Input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} placeholder="Ex: 100" />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} placeholder="Ex: Fungo, seca, etc." />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.lote_id || !form.clone_id || !form.setor_id || !form.quantidade}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}