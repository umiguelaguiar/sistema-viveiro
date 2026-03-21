import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useInsumos, useMovimentacoesInsumos } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default function Insumos() {
  const { data: insumos, isLoading } = useInsumos();
  const { data: movInsumos } = useMovimentacoesInsumos();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', unidade: '' });

  const handleSave = async () => {
    await base44.entities.Insumo.create(form);
    queryClient.invalidateQueries({ queryKey: ['insumos'] });
    setForm({ nome: '', unidade: '' });
    setOpen(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Insumo.delete(id);
    queryClient.invalidateQueries({ queryKey: ['insumos'] });
  };

  // Calcular saldo de cada insumo
  const saldoMap = {};
  movInsumos.forEach(m => {
    if (!saldoMap[m.insumo_id]) saldoMap[m.insumo_id] = 0;
    saldoMap[m.insumo_id] += m.tipo === 'entrada' ? (m.quantidade || 0) : -(m.quantidade || 0);
  });

  const columns = [
    { header: 'Nome', accessor: 'nome' },
    { header: 'Unidade', accessor: 'unidade' },
    {
      header: 'Saldo',
      render: (row) => {
        const saldo = saldoMap[row.id] || 0;
        return (
          <Badge variant="secondary" className={saldo > 0 ? 'bg-primary/10 text-primary' : saldo < 0 ? 'bg-destructive/10 text-destructive' : ''}>
            {saldo.toLocaleString('pt-BR')} {row.unidade}
          </Badge>
        );
      }
    },
  ];

  return (
    <div>
      <PageHeader
        title="Insumos"
        description="Cadastro de insumos do viveiro"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Insumo
          </Button>
        }
      />
      <DataTable columns={columns} data={insumos} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Insumo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Substrato" />
            </div>
            <div>
              <Label>Unidade</Label>
              <Input value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} placeholder="Ex: kg, L, unidade" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome || !form.unidade}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}