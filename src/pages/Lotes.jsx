import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useLotes } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';

export default function Lotes() {
  const { data: lotes, isLoading } = useLotes();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ codigo: '', data_inicio: '', quantidade_inicial: '' });

  const handleSave = async () => {
    const data = { ...form, quantidade_inicial: form.quantidade_inicial ? Number(form.quantidade_inicial) : undefined };
    if (editingId) {
      await base44.entities.Lote.update(editingId, data);
    } else {
      await base44.entities.Lote.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['lotes'] });
    setForm({ codigo: '', data_inicio: '', quantidade_inicial: '' });
    setEditingId(null);
    setOpen(false);
  };

  const handleEdit = (lote) => {
    setEditingId(lote.id);
    setForm({ codigo: lote.codigo, data_inicio: lote.data_inicio || '', quantidade_inicial: lote.quantidade_inicial?.toString() || '' });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Lote.delete(id);
    } catch (e) {
      if (!e?.message?.includes('not found')) throw e;
    }
    queryClient.invalidateQueries({ queryKey: ['lotes'] });
  };

  const columns = [
    { header: 'Código', accessor: 'codigo' },
    { header: 'Data Início', render: (row) => row.data_inicio ? row.data_inicio.split('-').reverse().join('/') : '—' },
    { header: 'Qtd. Inicial', render: (row) => row.quantidade_inicial?.toLocaleString('pt-BR') || '—' },
    { header: '', render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}><Pencil className="w-4 h-4" /></Button>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Lotes"
        description="Controle de lotes de produção"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Lote
          </Button>
        }
      />
      <DataTable columns={columns} data={lotes} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm({ codigo: '', data_inicio: '', quantidade_inicial: '' }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Lote' : 'Novo Lote'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código do Lote</Label>
              <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: L001" />
            </div>
            <div>
              <Label>Data de Início</Label>
              <Input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
            </div>
            <div>
              <Label>Quantidade Inicial</Label>
              <Input type="number" value={form.quantidade_inicial} onChange={e => setForm({ ...form, quantidade_inicial: e.target.value })} placeholder="Ex: 5000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.codigo}>{editingId ? 'Atualizar' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}