import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useClones, useEspecies } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

export default function Clones() {
  const { data: clones, isLoading } = useClones();
  const { data: especies } = useEspecies();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ codigo_clone: '', especie_id: '', fornecedor: '', observacoes: '' });

  const handleSave = async () => {
    await base44.entities.Clone.create(form);
    queryClient.invalidateQueries({ queryKey: ['clones'] });
    setForm({ codigo_clone: '', especie_id: '', fornecedor: '', observacoes: '' });
    setOpen(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Clone.delete(id);
    queryClient.invalidateQueries({ queryKey: ['clones'] });
  };

  const especieMap = {};
  especies.forEach(e => { especieMap[e.id] = e.nome; });

  const columns = [
    { header: 'Código', accessor: 'codigo_clone' },
    { header: 'Espécie', render: (row) => especieMap[row.especie_id] || '—' },
    { header: 'Fornecedor', render: (row) => row.fornecedor || '—' },
    { header: 'Observações', render: (row) => row.observacoes ? <span className="text-muted-foreground truncate max-w-[200px] block">{row.observacoes}</span> : '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Clones"
        description="Cadastro de clones de eucalipto"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Clone
          </Button>
        }
      />
      <DataTable columns={columns} data={clones} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Clone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código do Clone</Label>
              <Input value={form.codigo_clone} onChange={e => setForm({ ...form, codigo_clone: e.target.value })} placeholder="Ex: GG100" />
            </div>
            <div>
              <Label>Espécie</Label>
              <Select value={form.especie_id} onValueChange={v => setForm({ ...form, especie_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a espécie" /></SelectTrigger>
                <SelectContent>
                  {especies.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} placeholder="Nome do fornecedor" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.codigo_clone}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}