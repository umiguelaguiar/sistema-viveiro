import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { getPeriodos, dataEstaNoPeriodo } from '@/lib/periodoColaboradores';

const todayLocal = () => new Date().toLocaleDateString('en-CA');
const ATIVIDADES = { tubete: 'Tubete', selecao: 'Seleção', irrigacao: 'Irrigação', expedicao: 'Expedição', coleta: 'Coleta', plantio: 'Plantio' };
const ATIV_COLORS = { tubete: 'default', selecao: 'secondary', irrigacao: 'outline', expedicao: 'destructive', coleta: 'secondary', plantio: 'default' };
const periodos = getPeriodos(12);
const emptyForm = () => ({ colaborador_id: '', data: todayLocal(), atividade: 'tubete', quantidade: '', observacao: '' });

export default function ColaboradoresProducao() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [periodoKey, setPeriodoKey] = useState(periodos[0]?.key || '');

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => base44.entities.Colaborador.list() });
  const { data: producoes = [] } = useQuery({ queryKey: ['producoes-colab'], queryFn: () => base44.entities.ProducaoColaborador.list('-data', 1000) });

  const colabMap = Object.fromEntries(colaboradores.map(c => [c.id, c.nome]));
  const colabsAtivos = colaboradores.filter(c => (c.status_colaborador || 'ativo') === 'ativo');

  const save = async () => {
    await base44.entities.ProducaoColaborador.create({ ...form, quantidade: Number(form.quantidade) });
    qc.invalidateQueries({ queryKey: ['producoes-colab'] });
    setOpen(false); setForm(emptyForm());
  };

  const del = async (id) => {
    await base44.entities.ProducaoColaborador.delete(id);
    qc.invalidateQueries({ queryKey: ['producoes-colab'] });
  };

  const filtradas = periodoKey === 'todos' ? producoes : producoes.filter(p => dataEstaNoPeriodo(p.data, periodoKey));
  const total = filtradas.reduce((s, p) => s + (p.quantidade || 0), 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <Label className="text-xs mb-1 block">Período</Label>
            <Select value={periodoKey} onValueChange={setPeriodoKey}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{periodos.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {filtradas.length > 0 && <span className="text-sm text-muted-foreground mt-4">Total: <strong>{total.toLocaleString('pt-BR')}</strong></span>}
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm()); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Registrar Produção</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Produção</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Colaborador</Label>
                <Select value={form.colaborador_id} onValueChange={v => setForm(f => ({ ...f, colaborador_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{colabsAtivos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
                <div>
                  <Label>Atividade</Label>
                  <Select value={form.atividade} onValueChange={v => setForm(f => ({ ...f, atividade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ATIVIDADES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="Ex: 500" /></div>
              <div><Label>Observação</Label><Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional" /></div>
              <Button className="w-full" onClick={save}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {filtradas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro neste período.</p>}
        {[...filtradas].sort((a, b) => b.data.localeCompare(a.data)).map(p => (
          <div key={p.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
            <div>
              <p className="font-medium text-sm">{colabMap[p.colaborador_id] || '—'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{p.data?.split('-').reverse().join('/')}</span>
                <Badge variant={ATIV_COLORS[p.atividade]} className="text-xs">{ATIVIDADES[p.atividade]}</Badge>
                <span className="text-xs text-muted-foreground">{p.quantidade?.toLocaleString('pt-BR')} unid.</span>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}