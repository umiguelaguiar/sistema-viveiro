import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, UserX, ChevronDown, ChevronRight, CalendarDays, Clock, Trash2 } from 'lucide-react';

const todayLocal = () => new Date().toLocaleDateString('en-CA');

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo', color: 'default' },
  { value: 'afastado', label: 'Afastado', color: 'secondary' },
];

const MOTIVO_LABELS = {
  pedido_demissao: 'Pedido de Demissão',
  demissao: 'Demissão',
  acordo: 'Acordo',
  aposentadoria: 'Aposentadoria',
  outro: 'Outro',
};

const emptyForm = () => ({ nome: '', data_admissao: todayLocal(), funcao: '', status_colaborador: 'ativo' });
const emptyDesligamento = () => ({ data_saida: todayLocal(), motivo_saida: 'pedido_demissao', observacao_saida: '' });

export default function ColaboradoresCadastro() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const [desligandoId, setDesligandoId] = useState(null);
  const [desligForm, setDesligForm] = useState(emptyDesligamento());
  const [exFuncOpen, setExFuncOpen] = useState(false);
  const [exFuncDetalhe, setExFuncDetalhe] = useState(null);

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list('-created_date'),
  });
  const { data: frequencias = [] } = useQuery({
    queryKey: ['frequencias'],
    queryFn: () => base44.entities.Frequencia.list('-data', 1000),
  });

  const ativos = colaboradores.filter(c => (c.status_colaborador || 'ativo') !== 'desligado');
  const desligados = colaboradores.filter(c => c.status_colaborador === 'desligado');

  const save = async () => {
    const payload = { ...form, ativo: form.status_colaborador === 'ativo' };
    if (editing) {
      await base44.entities.Colaborador.update(editing.id, payload);
    } else {
      await base44.entities.Colaborador.create(payload);
    }
    qc.invalidateQueries({ queryKey: ['colaboradores'] });
    setOpen(false); setEditing(null); setForm(emptyForm());
  };

  const confirmarDesligamento = async () => {
    await base44.entities.Colaborador.update(desligandoId, {
      status_colaborador: 'desligado',
      ativo: false,
      ...desligForm,
    });
    qc.invalidateQueries({ queryKey: ['colaboradores'] });
    setDesligandoId(null); setDesligForm(emptyDesligamento());
  };

  const openEdit = (col) => {
    setEditing(col);
    setForm({ nome: col.nome, data_admissao: col.data_admissao, funcao: col.funcao, status_colaborador: col.status_colaborador || 'ativo' });
    setOpen(true);
  };

  const statusInfo = (col) => {
    const s = col.status_colaborador || 'ativo';
    return STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];
  };

  // Resumo de frequência de um colaborador
  const resumoFreq = (colabId) => {
    const cf = frequencias.filter(f => f.colaborador_id === colabId);
    return {
      total: cf.length,
      presentes: cf.filter(f => f.status === 'presente').length,
      faltas: cf.filter(f => f.status === 'falta').length,
      atestados: cf.filter(f => f.status === 'atestado').length,
      hExtras: cf.reduce((s, f) => s + (f.horas_extras || 0), 0),
    };
  };

  // Tempo de empresa
  const tempoEmpresa = (admissao, saida) => {
    if (!admissao) return '—';
    const inicio = new Date(admissao + 'T12:00:00');
    const fim = saida ? new Date(saida + 'T12:00:00') : new Date();
    const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
    if (meses < 1) return 'Menos de 1 mês';
    if (meses < 12) return `${meses} mês${meses > 1 ? 'es' : ''}`;
    const anos = Math.floor(meses / 12);
    const m = meses % 12;
    return `${anos} ano${anos > 1 ? 's' : ''}${m > 0 ? ` e ${m} mês${m > 1 ? 'es' : ''}` : ''}`;
  };

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {ativos.filter(c => (c.status_colaborador || 'ativo') === 'ativo').length} ativos ·{' '}
          {ativos.filter(c => c.status_colaborador === 'afastado').length} afastados
        </p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm()); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo Colaborador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Colaborador</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome completo</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome" /></div>
              <div><Label>Data de Admissão</Label><Input type="date" value={form.data_admissao} onChange={e => setForm({ ...form, data_admissao: e.target.value })} /></div>
              <div><Label>Função</Label><Input value={form.funcao} onChange={e => setForm({ ...form, funcao: e.target.value })} placeholder="Ex: Produção, Irrigação..." /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status_colaborador} onValueChange={v => setForm({ ...form, status_colaborador: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={save}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de ativos/afastados */}
      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {ativos.map(col => {
          const si = statusInfo(col);
          return (
            <div key={col.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-sm">{col.nome}</p>
                <p className="text-xs text-muted-foreground">{col.funcao} · Admissão: {col.data_admissao?.split('-').reverse().join('/')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={si.color}>{si.label}</Badge>
                <Button size="icon" variant="ghost" onClick={() => openEdit(col)}><Pencil className="w-4 h-4" /></Button>
                <Button
                  size="icon" variant="ghost"
                  title="Desligar colaborador"
                  onClick={() => { setDesligandoId(col.id); setDesligForm(emptyDesligamento()); }}
                >
                  <UserX className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog de desligamento */}
      <Dialog open={!!desligandoId} onOpenChange={(v) => { if (!v) setDesligandoId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="w-5 h-5" /> Desligar Colaborador
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Preencha as informações de desligamento. O colaborador será movido para a área de ex-funcionários.
          </p>
          <div className="space-y-3">
            <div><Label>Data de Saída</Label><Input type="date" value={desligForm.data_saida} onChange={e => setDesligForm(f => ({ ...f, data_saida: e.target.value }))} /></div>
            <div>
              <Label>Motivo</Label>
              <Select value={desligForm.motivo_saida} onValueChange={v => setDesligForm(f => ({ ...f, motivo_saida: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MOTIVO_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Observação</Label><Input value={desligForm.observacao_saida} onChange={e => setDesligForm(f => ({ ...f, observacao_saida: e.target.value }))} placeholder="Opcional" /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDesligandoId(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmarDesligamento}>Confirmar Desligamento</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seção ex-funcionários */}
      {desligados.length > 0 && (
        <div className="mt-6">
          <button
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
            onClick={() => setExFuncOpen(v => !v)}
          >
            {exFuncOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Ex-funcionários ({desligados.length})
          </button>

          {exFuncOpen && (
            <div className="grid gap-3">
              {desligados.map(col => {
                const freq = resumoFreq(col.id);
                const aberto = exFuncDetalhe === col.id;
                return (
                  <div key={col.id} className="bg-muted/40 border border-border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/60 transition-colors"
                      onClick={() => setExFuncDetalhe(aberto ? null : col.id)}
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground/80">{col.nome}</p>
                        <p className="text-xs text-muted-foreground">{col.funcao}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-muted-foreground">Desligado</Badge>
                        {aberto ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {aberto && (
                      <div className="border-t border-border px-4 py-4 space-y-4 bg-background/60">
                        {/* Datas e tempo de empresa */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Admissão</p>
                            <p className="text-sm font-medium mt-0.5">{col.data_admissao?.split('-').reverse().join('/') || '—'}</p>
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Saída</p>
                            <p className="text-sm font-medium mt-0.5">{col.data_saida?.split('-').reverse().join('/') || '—'}</p>
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Tempo de empresa</p>
                            <p className="text-sm font-medium mt-0.5">{tempoEmpresa(col.data_admissao, col.data_saida)}</p>
                          </div>
                        </div>

                        {/* Motivo e observação */}
                        <div className="flex flex-wrap gap-3">
                          {col.motivo_saida && (
                            <div>
                              <p className="text-xs text-muted-foreground">Motivo</p>
                              <Badge variant="secondary" className="mt-1">{MOTIVO_LABELS[col.motivo_saida]}</Badge>
                            </div>
                          )}
                          {col.observacao_saida && (
                            <div>
                              <p className="text-xs text-muted-foreground">Observação</p>
                              <p className="text-sm mt-0.5 italic text-muted-foreground">"{col.observacao_saida}"</p>
                            </div>
                          )}
                        </div>

                        {/* Resumo de frequência */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Histórico de Frequência</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="bg-muted rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-green-600">{freq.presentes}</p>
                              <p className="text-xs text-muted-foreground">Presenças</p>
                            </div>
                            <div className="bg-muted rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-destructive">{freq.faltas}</p>
                              <p className="text-xs text-muted-foreground">Faltas</p>
                            </div>
                            <div className="bg-muted rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-amber-600">{freq.atestados}</p>
                              <p className="text-xs text-muted-foreground">Atestados</p>
                            </div>
                            <div className="bg-muted rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-blue-600">{freq.hExtras.toFixed(1)}h</p>
                              <p className="text-xs text-muted-foreground">H. Extras</p>
                            </div>
                          </div>
                          {freq.total === 0 && <p className="text-xs text-muted-foreground mt-1">Sem registros de frequência.</p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}