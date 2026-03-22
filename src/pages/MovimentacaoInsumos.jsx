import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useMovimentacoesInsumos, useInsumos, useClones, useLotes } from '@/hooks/useNurseryData';
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

export default function MovimentacaoInsumos() {
  const { data: movInsumos, isLoading } = useMovimentacoesInsumos();
  const { data: insumos } = useInsumos();
  const { data: clones } = useClones();
  const { data: lotes } = useLotes();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const [form, setForm] = useState({ insumo_id: '', tipo: '', quantidade: '', data: todayLocal(), lote_id: '', clone_id: '' });

  const handleSave = async () => {
    const payload = {
      insumo_id: form.insumo_id,
      tipo: form.tipo,
      quantidade: Number(form.quantidade),
      data: form.data,
    };
    if (form.lote_id) payload.lote_id = form.lote_id;
    if (form.clone_id) payload.clone_id = form.clone_id;

    await base44.entities.MovimentacaoInsumo.create(payload);
    queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
    setForm({ insumo_id: '', tipo: '', quantidade: '', data: new Date().toISOString().split('T')[0], lote_id: '', clone_id: '' });
    setOpen(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.MovimentacaoInsumo.delete(id);
    queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
  };

  const insumoMap = {};
  insumos.forEach(i => { insumoMap[i.id] = i; });
  const cloneMap = {};
  clones.forEach(c => { cloneMap[c.id] = c.codigo_clone; });
  const loteMap = {};
  lotes.forEach(l => { loteMap[l.id] = l.codigo; });

  const columns = [
    { header: 'Data', render: (row) => row.data ? format(new Date(row.data), 'dd/MM/yyyy') : '—' },
    { header: 'Insumo', render: (row) => insumoMap[row.insumo_id]?.nome || '—' },
    {
      header: 'Tipo',
      render: (row) => (
        <Badge className={row.tipo === 'entrada' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}>
          {row.tipo === 'entrada' ? 'Entrada' : 'Saída'}
        </Badge>
      )
    },
    {
      header: 'Quantidade',
      render: (row) => `${row.quantidade?.toLocaleString('pt-BR')} ${insumoMap[row.insumo_id]?.unidade || ''}`
    },
    { header: 'Clone', render: (row) => cloneMap[row.clone_id] || '—' },
    { header: 'Lote', render: (row) => loteMap[row.lote_id] || '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Movimentação de Insumos"
        description="Entradas e saídas de insumos"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Movimentação
          </Button>
        }
      />
      <DataTable columns={columns} data={movInsumos} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Movimentação de Insumo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Insumo</Label>
              <Select value={form.insumo_id} onValueChange={v => setForm({ ...form, insumo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} placeholder="Ex: 50" />
            </div>
            <div>
              <Label>Clone (opcional)</Label>
              <Select value={form.clone_id} onValueChange={v => setForm({ ...form, clone_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lote (opcional)</Label>
              <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.insumo_id || !form.tipo || !form.quantidade}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}