import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, UserCheck, UserX } from 'lucide-react';

const todayLocal = () => new Date().toLocaleDateString('en-CA');

export default function ColaboradoresCadastro() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', data_admissao: todayLocal(), funcao: '', ativo: true });

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list('-created_date'),
  });

  const save = async () => {
    if (editing) {
      await base44.entities.Colaborador.update(editing.id, form);
    } else {
      await base44.entities.Colaborador.create(form);
    }
    qc.invalidateQueries({ queryKey: ['colaboradores'] });
    setOpen(false);
    setEditing(null);
    setForm({ nome: '', data_admissao: todayLocal(), funcao: '', ativo: true });
  };

  const toggleAtivo = async (col) => {
    await base44.entities.Colaborador.update(col.id, { ativo: !col.ativo });
    qc.invalidateQueries({ queryKey: ['colaboradores'] });
  };

  const openEdit = (col) => {
    setEditing(col);
    setForm({ nome: col.nome, data_admissao: col.data_admissao, funcao: col.funcao, ativo: col.ativo });
    setOpen(true);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{colaboradores.filter(c => c.ativo !== false).length} colaboradores ativos</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ nome: '', data_admissao: todayLocal(), funcao: '', ativo: true }); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo Colaborador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Colaborador</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome completo</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome" /></div>
              <div><Label>Data de Admissão</Label><Input type="date" value={form.data_admissao} onChange={e => setForm({ ...form, data_admissao: e.target.value })} /></div>
              <div><Label>Função</Label><Input value={form.funcao} onChange={e => setForm({ ...form, funcao: e.target.value })} placeholder="Ex: Produção, Irrigação..." /></div>
              <Button className="w-full" onClick={save}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {colaboradores.map(col => (
          <div key={col.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
            <div>
              <p className="font-medium text-sm">{col.nome}</p>
              <p className="text-xs text-muted-foreground">{col.funcao} · Admissão: {col.data_admissao?.split('-').reverse().join('/')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={col.ativo !== false ? 'default' : 'secondary'}>{col.ativo !== false ? 'Ativo' : 'Inativo'}</Badge>
              <Button size="icon" variant="ghost" onClick={() => openEdit(col)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => toggleAtivo(col)}>
                {col.ativo !== false ? <UserX className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-primary" />}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}