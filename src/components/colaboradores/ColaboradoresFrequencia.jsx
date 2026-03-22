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
import { getPeriodos, dataEstaNoPeriodo, getPeriodoDatasLabel } from '@/lib/periodoColaboradores';

const todayLocal = () => new Date().toLocaleDateString('en-CA');

const STATUS_LABELS = { presente: 'Presente', falta: 'Falta', atestado: 'Atestado', folga: 'Folga' };
const STATUS_COLORS = { presente: 'default', falta: 'destructive', atestado: 'secondary', folga: 'outline' };

function isWeekendDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

function calcHoras(entrada, saida, isWeekend, isPlantao) {
  if (!entrada || !saida) return { trabalhadas: null, extras: null };
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = saida.split(':').map(Number);
  const totalMin = (sh * 60 + sm) - (eh * 60 + em);
  if (totalMin <= 0) return { trabalhadas: null, extras: null };

  // Plantão ou fim de semana: sem desconto de almoço
  const trabalhadasMin = (isWeekend || isPlantao) ? totalMin : totalMin - 60;
  const trabalhadas = Math.max(0, trabalhadasMin / 60);
  // Fim de semana: tudo é extra. Dias úteis: extra = acima de 9h
  const jornadaBase = isWeekend ? 0 : 9;
  const extras = Math.max(0, trabalhadas - jornadaBase);
  return { trabalhadas: parseFloat(trabalhadas.toFixed(2)), extras: parseFloat(extras.toFixed(2)) };
}

const emptyForm = (data = todayLocal()) => {
  const weekend = isWeekendDate(data);
  return {
    colaborador_id: '', data,
    status: 'presente',
    hora_entrada: '07:00', hora_saida: '17:00',
    e_plantao: weekend, // auto-plantão no fim de semana
    tipo_hora_extra: 'banco_horas',
    observacao: ''
  };
};

const periodos = getPeriodos(12);

export default function ColaboradoresFrequencia() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [periodoKey, setPeriodoKey] = useState(periodos[0]?.key || '');
  const [filtroColab, setFiltroColab] = useState('todos');

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => base44.entities.Colaborador.list() });
  const { data: frequencias = [] } = useQuery({ queryKey: ['frequencias'], queryFn: () => base44.entities.Frequencia.list('-data', 1000) });

  // Apenas ativos (não afastados)
  const colabsAtivos = colaboradores.filter(c => (c.status_colaborador || 'ativo') === 'ativo');
  const colabMap = Object.fromEntries(colaboradores.map(c => [c.id, c]));

  const sf = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    // Se mudou a data, auto-set plantão no fim de semana
    if (k === 'data') {
      updated.e_plantao = isWeekendDate(v);
    }
    return updated;
  });

  const weekend = isWeekendDate(form.data);
  const skipHoras = ['atestado', 'folga'].includes(form.status);

  const { trabalhadas, extras } = (() => {
    if (skipHoras || form.status !== 'presente') return { trabalhadas: null, extras: null };
    return calcHoras(form.hora_entrada, form.hora_saida, weekend, form.e_plantao);
  })();

  const save = async () => {
    const payload = {
      ...form,
      e_plantao: weekend ? true : form.e_plantao,
      horas_trabalhadas: trabalhadas,
      horas_extras: trabalhadas !== null ? extras : null,
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
    setForm({
      colaborador_id: f.colaborador_id, data: f.data, status: f.status,
      hora_entrada: f.hora_entrada || '07:00', hora_saida: f.hora_saida || '17:00',
      e_plantao: f.e_plantao || false, tipo_hora_extra: f.tipo_hora_extra || 'banco_horas',
      observacao: f.observacao || ''
    });
    setOpen(true);
  };

  // Filtragem por período
  const freqPeriodo = periodoKey === 'todos'
    ? frequencias
    : frequencias.filter(f => dataEstaNoPeriodo(f.data, periodoKey));
  const freqFiltradas = filtroColab === 'todos' ? freqPeriodo : freqPeriodo.filter(f => f.colaborador_id === filtroColab);

  // Ordenar por data desc, depois por nome
  const freqOrdenadas = [...freqFiltradas].sort((a, b) => b.data.localeCompare(a.data));

  // Totais do período filtrado
  const presentes = freqFiltradas.filter(f => f.status === 'presente').length;
  const faltas = freqFiltradas.filter(f => f.status === 'falta').length;
  const atestados = freqFiltradas.filter(f => f.status === 'atestado').length;
  const folgas = freqFiltradas.filter(f => f.status === 'folga').length;

  return (
    <div className="space-y-4 pt-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3">
          <div>
            <Label className="text-xs mb-1 block">Período</Label>
            <Select value={periodoKey} onValueChange={setPeriodoKey}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{periodos.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{getPeriodoDatasLabel(periodoKey)}</p>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Colaborador</Label>
            <Select value={filtroColab} onValueChange={setFiltroColab}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {colaboradores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
                  <SelectContent>{colabsAtivos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
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
                  {weekend && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 font-medium">
                      ⚠️ Final de semana — registrado como plantão automaticamente. Todo trabalho conta como hora extra.
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Entrada</Label><Input type="time" value={form.hora_entrada} onChange={e => sf('hora_entrada', e.target.value)} /></div>
                    <div><Label>Saída</Label><Input type="time" value={form.hora_saida} onChange={e => sf('hora_saida', e.target.value)} /></div>
                  </div>
                  {!weekend && (
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="plantao" checked={form.e_plantao} onChange={e => sf('e_plantao', e.target.checked)} className="w-4 h-4" />
                      <Label htmlFor="plantao" className="cursor-pointer">Plantão (sem desconto de almoço)</Label>
                    </div>
                  )}
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

      {/* Resumo do período */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="default">Presentes: {presentes}</Badge>
        <Badge variant="destructive">Faltas: {faltas}</Badge>
        <Badge variant="secondary">Atestados: {atestados}</Badge>
        <Badge variant="outline">Folgas: {folgas}</Badge>
      </div>

      {/* Lista completa */}
      <div className="space-y-2">
        {freqOrdenadas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro neste período.</p>}
        {freqOrdenadas.map(f => {
          const colab = colabMap[f.colaborador_id];
          const fw = isWeekendDate(f.data);
          return (
            <div key={f.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{colab?.nome || '—'}</p>
                  <span className="text-xs text-muted-foreground">{f.data?.split('-').reverse().join('/')}</span>
                  {fw && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">FDS</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant={STATUS_COLORS[f.status]} className="text-xs">{STATUS_LABELS[f.status]}</Badge>
                  {f.hora_entrada && f.hora_saida && f.status === 'presente' && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{f.hora_entrada}–{f.hora_saida}
                      {f.horas_trabalhadas != null && ` · ${f.horas_trabalhadas}h`}
                      {f.horas_extras > 0 && <span className="text-amber-600"> (+{f.horas_extras}h extra)</span>}
                    </span>
                  )}
                  {f.observacao && <span className="text-xs text-muted-foreground italic">{f.observacao}</span>}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}