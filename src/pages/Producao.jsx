import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useProducoes, useClones, useLotes, useSetores } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function Producao() {
  const { data: producoes, isLoading } = useProducoes();
  const { data: clones } = useClones();
  const { data: lotes } = useLotes();
  const { data: setores } = useSetores();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const [form, setForm] = useState({ lote_id: '', clone_id: '', quantidade: '', setor_id: '', data: todayLocal() });



  const handleSave = async () => {
    await base44.entities.Producao.create({
      ...form,
      quantidade: Number(form.quantidade)
    });
    queryClient.invalidateQueries({ queryKey: ['producoes'] });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
    queryClient.invalidateQueries({ queryKey: ['perdas'] });
    setForm({ lote_id: '', clone_id: '', quantidade: '', setor_id: '', data: todayLocal() });
    setOpen(false);
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Producao.delete(id);
    } catch (e) {
      if (!e.message?.includes('not found')) throw e;
    }
    queryClient.invalidateQueries({ queryKey: ['producoes'] });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
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
    { header: 'Setor', render: (row) => setorMap[row.setor_id] || '—' },
    { header: 'Quantidade', render: (row) => row.quantidade?.toLocaleString('pt-BR') },
    { header: 'Bandejas', render: (row) => row.quantidade ? `${Math.ceil(row.quantidade / 187).toLocaleString('pt-BR')} bdj` : '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Produção"
        description="Registro de produção de mudas"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Produção
          </Button>
        }
      />
      <DataTable columns={columns} data={producoes} isLoading={isLoading} onDelete={handleDelete} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Produção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clone</Label>
              <Select value={form.clone_id} onValueChange={v => setForm({ ...form, clone_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o clone" /></SelectTrigger>
                <SelectContent>
                  {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lote</Label>
              <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o lote" /></SelectTrigger>
                <SelectContent>
                  {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor</Label>
              <Select value={form.setor_id} onValueChange={v => setForm({ ...form, setor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade de Bandejas</Label>
              <Input type="number" value={form.bandejas} onChange={e => setForm({ ...form, bandejas: e.target.value, quantidade: e.target.value ? String(Number(e.target.value) * 187) : '' })} placeholder="Ex: 10" />
              {form.bandejas && <p className="text-xs text-muted-foreground mt-1">{(Number(form.bandejas) * 187).toLocaleString('pt-BR')} mudas</p>}
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.lote_id || !form.clone_id || !form.quantidade || !form.setor_id}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}