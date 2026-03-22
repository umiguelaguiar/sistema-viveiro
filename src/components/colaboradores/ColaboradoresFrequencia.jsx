import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';

const todayLocal = () => new Date().toLocaleDateString('en-CA');

const STATUS_LABELS = { presente: 'Presente', falta: 'Falta', atestado: 'Atestado', folga: 'Folga', afastado: 'Afastado' };
const STATUS_COLORS = { presente: 'default', falta: 'destructive', atestado: 'secondary', folga: 'outline', afastado: 'outline' };

function calcHoras(entrada, saida, isWeekend, isPlantao) {
  if (!entrada || !saida) return { trabalhadas: null, extras: null };
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = saida.split(':').map(Number);
  const totalMin = (sh * 60 + sm) - (eh * 60 + em);
  if (totalMin <= 0) return { trabalhadas: null, extras: null };

  let trabalhadasMin = totalMin;
  if (!isPlantao && !isWeekend) {
    trabalhadasMin = totalMin - 60; // desconta 1h almoço
  }
  const trabalhadas = Math.max(0, trabalhadasMin / 60);
  const jornadaBase = isWeekend ? 0 : 9;
  const extras = Math.max(0, trabalhadas - jornadaBase);
  return { trabalhadas: parseFloat(trabalhadas.toFixed(2)), extras: parseFloat(extras.toFixed(2)) };
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

const emptyForm = () => ({
  colaborador_id: '', data: todayLocal(), status: 'presente',
  hora_entrada: '07:00', hora_saida: '17:00',
  e_plantao: false, tipo_hora_extra: 'banco_horas', observacao: ''
});

export default function ColaboradoresFrequencia() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [filtroData, setFiltroData] = useState(todayLocal());

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => base44.entities.Colaborador.list() });
  const { data: frequencias = [] } = useQuery({ queryKey: ['frequencias'], queryFn: () => base44.entities.Frequencia.list('-data', 200) });

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { trabalhadas, extras } = (() => {
    const skip = ['atestado', 'folga', 'afastado'].includes(form.status);
    if (skip) return { trabalhadas: null, extras: null };
    return calcHoras(form.hora_entrada, form.hora_saida, isWeekend(form.data), form.e_plantao);
  })();

  const save = async () => {
    const skip = ['atestado', 'folga', 'afastado'].includes(form.status);
    const payload = {
      ...form,
      horas_trabalhadas: skip ? null : trabalhadas,
      horas_extras: skip ? null : extras,
    };
    if (editing) {
      await base44.entities.Frequencia.update(editing.id, payload);
    } else {
      await base44.entities.Frequencia.create(payload);
    }
    qc.invalidateQueries({ queryKey: ['frequencias'] });
    setOpen(false); setEditing(null); setForm(emptyForm());
  };

  const del = async (id) => {
    await base44.entities.Frequencia.delete(id);
    qc.invalidateQueries({ queryKey: ['frequencias'] });
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({ colaborador_id: f.colaborador_id, data: f.data, status: f.status, hora_entrada: f.hora_entrada || '07:00', hora_saida: f.hora_saida || '17:00', e_plantao: f.e_plantao || false, tipo_hora_extra: f.tipo_hora_extra || 'banco_horas', observacao: f.observacao || '' });
    setOpen(true);
  };

  const colabMap = Object.fromEntries(colaboradores.map(c => [c.id, c.nome]));
  const filtradas = frequencias.filter(f => f.data === filtroData);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Data:</Label>
          <Input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} className="w-40" />
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm()); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Registrar Frequência</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Registrar'} Frequência</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Colaborador</Label>
                <Select value={form.colaborador_id} onValueChange={v => sf('colaborador_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{colaboradores.filter(c => c.ativo !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => sf('data', e.target.value)} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => sf('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.status === 'presente' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Entrada</Label><Input type="time" value={form.hora_entrada} onChange={e => sf('hora_entrada', e.target.value)} /></div>
                    <div><Label>Saída</Label><Input type="time" value={form.hora_saida} onChange={e => sf('hora_saida', e.target.value)} /></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="plantao" checked={form.e_plantao} onChange={e => sf('e_plantao', e.target.checked)} className="w-4 h-4" />
                    <Label htmlFor="plantao" className="cursor-pointer">Plantão (sem desconto de almoço)</Label>
                  </div>
                  {isWeekend(form.data) && <p className="text-xs text-amber-600 font-medium">⚠️ Final de semana — todo trabalho conta como hora extra</p>}
                  {trabalhadas !== null && (
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span>Horas trabalhadas:</span><strong>{trabalhadas}h</strong></div>
                      {extras > 0 && <div className="flex justify-between text-amber-600"><span>Horas extras:</span><strong>+{extras}h</strong></div>}
                    </div>
                  )}
                  {extras > 0 && (
                    <div>
                      <Label>Horas extras — contabilizar como:</Label>
                      <Select value={form.tipo_hora_extra} onValueChange={v => sf('tipo_hora_extra', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="banco_horas">Banco de Horas</SelectItem>
                          <SelectItem value="pagamento">Pagamento 100%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
              <div><Label>Observação</Label><Input value={form.observacao} onChange={e => sf('observacao', e.target.value)} placeholder="Opcional" /></div>
              <Button className="w-full" onClick={save}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([k, l]) => {
          const count = filtradas.filter(f => f.status === k).length;
          if (count === 0) return null;
          return <Badge key={k} variant={STATUS_COLORS[k]}>{l}: {count}</Badge>;
        })}
        {filtradas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro para esta data.</p>}
      </div>

      <div className="space-y-2">
        {filtradas.map(f => (
          <div key={f.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
            <div>
              <p className="font-medium text-sm">{colabMap[f.colaborador_id] || '—'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={STATUS_COLORS[f.status]} className="text-xs">{STATUS_LABELS[f.status]}</Badge>
                {f.hora_entrada && f.hora_saida && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{f.hora_entrada}–{f.hora_saida}
                    {f.horas_trabalhadas && ` · ${f.horas_trabalhadas}h`}
                    {f.horas_extras > 0 && <span className="text-amber-600"> (+{f.horas_extras}h extra)</span>}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}