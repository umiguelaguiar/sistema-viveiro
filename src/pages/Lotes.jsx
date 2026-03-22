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
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function Lotes() {
  const { data: lotes, isLoading } = useLotes();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ codigo: '', data_inicio: '', quantidade_inicial: '' });

  const handleSave = async () => {
    await base44.entities.Lote.create({
      ...form,
      quantidade_inicial: form.quantidade_inicial ? Number(form.quantidade_inicial) : undefined
    });
    queryClient.invalidateQueries({ queryKey: ['lotes'] });
    setForm({ codigo: '', data_inicio: '', quantidade_inicial: '' });
    setOpen(false);
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Lote</DialogTitle></DialogHeader>
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
            <Button onClick={handleSave} disabled={!form.codigo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}