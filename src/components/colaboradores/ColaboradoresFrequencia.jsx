import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
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

const emptyForm = (data = todayLocal()) => ({
  colaborador_id: '', data,
  status: 'presente',
  hora_entrada: '07:00', hora_saida: '17:00',
  e_plantao: false,
  tipo_hora_extra: 'banco_horas',
  observacao: ''
});

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

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const weekend = isWeekendDate(form.data);
  const skipHoras = ['atestado', 'folga'].includes(form.status);

  const { trabalhadas, extras } = (() => {
    if (skipHoras || form.status !== 'presente') return { trabalhadas: null, extras: null };
    return calcHoras(form.hora_entrada, form.hora_saida, weekend, form.e_plantao);
  })();

  const save = async () => {
    if (!form.colaborador_id) return;
    const payload = {
      ...form,
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

  // Agrupar por colaborador
  const grupoPorColab = {};
  freqFiltradas.forEach(f => {
    if (!grupoPorColab[f.colaborador_id]) grupoPorColab[f.colaborador_id] = [];
    grupoPorColab[f.colaborador_id].push(f);
  });
  // Ordenar registros de cada colaborador por data desc
  Object.keys(grupoPorColab).forEach(id => {
    grupoPorColab[id].sort((a, b) => b.data.localeCompare(a.data));
  });
  // Ordenar colaboradores por nome
  const colaboradoresComFreq = Object.keys(grupoPorColab).sort((a, b) => {
    const na = colabMap[a]?.nome || '';
    const nb = colabMap[b]?.nome || '';
    return na.localeCompare(nb);
  });

  return (
    <div className="space-y-4 pt-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3">
          <div>
            <Label className="text-xs mb-1 block">Período</Label>
            <Select value={periodoKey} onValueChange={setPeriodoKey}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os períodos</SelectItem>
                {periodos.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {periodoKey !== 'todos' && <p className="text-xs text-muted-foreground mt-1">{getPeriodoDatasLabel(periodoKey)}</p>}
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

      {/* Lista agrupada por colaborador */}
      <div className="space-y-3">
        {colaboradoresComFreq.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro neste período.</p>}
        {colaboradoresComFreq.map(colabId => (
          <ColabCard
            key={colabId}
            colab={colabMap[colabId]}
            registros={grupoPorColab[colabId]}
            onEdit={openEdit}
            onDelete={del}
          />
        ))}
      </div>
    </div>
  );
}

function ColabCard({ colab, registros, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const presentes = registros.filter(f => f.status === 'presente').length;
  const faltas = registros.filter(f => f.status === 'falta').length;
  const atestados = registros.filter(f => f.status === 'atestado').length;
  const folgas = registros.filter(f => f.status === 'folga').length;
  const totalHoras = registros.reduce((sum, f) => sum + (f.horas_trabalhadas || 0), 0);
  const totalExtras = registros.reduce((sum, f) => sum + (f.horas_extras || 0), 0);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Cabeçalho do card */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {(colab?.nome || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{colab?.nome || '—'}</p>
            <p className="text-xs text-muted-foreground">{registros.length} registro{registros.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {presentes > 0 && <Badge variant="default" className="text-xs">{presentes}P</Badge>}
          {faltas > 0 && <Badge variant="destructive" className="text-xs">{faltas}F</Badge>}
          {atestados > 0 && <Badge variant="secondary" className="text-xs">{atestados}A</Badge>}
          {folgas > 0 && <Badge variant="outline" className="text-xs">{folgas}Fg</Badge>}
          {totalHoras > 0 && <span className="text-xs text-muted-foreground">{totalHoras.toFixed(1)}h</span>}
          {totalExtras > 0 && <span className="text-xs text-amber-600">+{totalExtras.toFixed(1)}h extra</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
        </div>
      </button>

      {/* Registros expandidos */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {registros.map(f => {
            const fw = isWeekendDate(f.data);
            return (
              <div key={f.id} className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{f.data?.split('-').reverse().join('/')}</span>
                    {fw && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">FDS</Badge>}
                    <Badge variant={STATUS_COLORS[f.status]} className="text-xs">{STATUS_LABELS[f.status]}</Badge>
                  </div>
                  {f.hora_entrada && f.hora_saida && f.status === 'presente' && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {f.hora_entrada}–{f.hora_saida}
                      {f.horas_trabalhadas != null && ` · ${f.horas_trabalhadas}h`}
                      {f.horas_extras > 0 && <span className="text-amber-600"> (+{f.horas_extras}h extra)</span>}
                    </div>
                  )}
                  {f.observacao && <p className="text-xs text-muted-foreground italic mt-0.5">{f.observacao}</p>}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(f.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}