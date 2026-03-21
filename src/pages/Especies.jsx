import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useEspecies } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

export default function Especies() {
  const { data: especies, isLoading } = useEspecies();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', tempo_producao_dias: '' });

  const handleSave = async () => {
    await base44.entities.Especie.create({
      ...form,
      tempo_producao_dias: form.tempo_producao_dias ? Number(form.tempo_producao_dias) : undefined
    });
    queryClient.invalidateQueries({ queryKey: ['especies'] });
    setForm({ nome: '', tempo_producao_dias: '' });
    setOpen(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Especie.delete(id);
    queryClient.invalidateQueries({ queryKey: ['especies'] });
  };

  const columns = [
    { header: 'Nome', accessor: 'nome' },
    { header: 'Tempo Produção (dias)', render: (row) => row.tempo_producao_dias || '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Espécies"
        description="Cadastro de espécies de eucalipto"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Espécie
          </Button>
        }
      />
      <DataTable columns={columns} data={especies} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Espécie</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Eucalyptus grandis" />
            </div>
            <div>
              <Label>Tempo de Produção (dias)</Label>
              <Input type="number" value={form.tempo_producao_dias} onChange={e => setForm({ ...form, tempo_producao_dias: e.target.value })} placeholder="Ex: 90" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}