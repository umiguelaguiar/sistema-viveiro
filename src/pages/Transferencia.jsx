import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useMovimentacoes, useClones, useLotes, useSetores, useProducoes, usePerdas } from '@/hooks/useNurseryData';
import { calculateStock, getStockForSetorCloneLote } from '@/lib/stockCalculations';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Transferencia() {
  const { data: movimentacoes, isLoading } = useMovimentacoes();
  const { data: clones } = useClones();
  const { data: lotes } = useLotes();
  const { data: setores } = useSetores();
  const { data: producoes } = useProducoes();
  const { data: perdas } = usePerdas();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const emptyForm = () => ({ lote_id: '', clone_id: '', quantidade: '', bandejas: '', setor_origem_id: '', setor_destino_id: '', data: todayLocal(), descartadas: '' });
  const [form, setForm] = useState(emptyForm());

  const stock = useMemo(() => calculateStock(producoes, movimentacoes, perdas), [producoes, movimentacoes, perdas]);

  const transferencias = movimentacoes.filter(m => m.tipo === 'transferencia');

  // Detecta se é transferência casa de sombra → rustificação
  const setorOrigemNome = useMemo(() => setores.find(s => s.id === form.setor_origem_id)?.nome?.toLowerCase() || '', [setores, form.setor_origem_id]);
  const setorDestinoNome = useMemo(() => setores.find(s => s.id === form.setor_destino_id)?.nome?.toLowerCase() || '', [setores, form.setor_destino_id]);
  const isEnraizamentoTransfer = setorOrigemNome.includes('sombra') && setorDestinoNome.includes('rustif');

  const disponivel = form.setor_origem_id && form.clone_id && form.lote_id
    ? getStockForSetorCloneLote(stock, form.setor_origem_id, form.clone_id, form.lote_id)
    : 0;

  const handleEdit = (row) => {
    setEditingId(row.id);
    const origemNome = setores.find(s => s.id === row.setor_origem_id)?.nome?.toLowerCase() || '';
    const destinoNome = setores.find(s => s.id === row.setor_destino_id)?.nome?.toLowerCase() || '';
    const isEnraiz = origemNome.includes('sombra') && destinoNome.includes('rustif');
    const perdaAssociada = isEnraiz ? perdas.find(p =>
      p.lote_id === row.lote_id && p.clone_id === row.clone_id &&
      p.setor_id === row.setor_destino_id && p.data === row.data &&
      p.motivo?.includes('Descarte no enraizamento')
    ) : null;
    setForm({ lote_id: row.lote_id, clone_id: row.clone_id, quantidade: row.quantidade, bandejas: row.quantidade ? String(Math.ceil(row.quantidade / 187)) : '', setor_origem_id: row.setor_origem_id, setor_destino_id: row.setor_destino_id, data: row.data, descartadas: perdaAssociada ? String(perdaAssociada.quantidade) : '' });
    setOpen(true);
  };

  const handleSave = async () => {
    const qty = Number(form.quantidade);
    if (!editingId && qty > disponivel) {
      toast.error(`Estoque insuficiente. Disponível: ${disponivel}`);
      return;
    }
    if (editingId) {
      await base44.entities.Movimentacao.update(editingId, {
        lote_id: form.lote_id, clone_id: form.clone_id, quantidade: qty,
        setor_origem_id: form.setor_origem_id, setor_destino_id: form.setor_destino_id,
        data: form.data, tipo: 'transferencia',
      });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      setForm(emptyForm()); setEditingId(null); setOpen(false);
      return;
    }
    await base44.entities.Movimentacao.create({
      lote_id: form.lote_id,
      clone_id: form.clone_id,
      quantidade: qty,
      setor_origem_id: form.setor_origem_id,
      setor_destino_id: form.setor_destino_id,
      data: form.data,
      tipo: 'transferencia',
    });

    // Se for transferência casa de sombra → rustificação, atualiza indicadores e registra perdas
    if (isEnraizamentoTransfer) {
      const descartadas = Number(form.descartadas) || 0;
      const lote = lotes.find(l => l.id === form.lote_id);
      if (lote) {
        const novas_enraizadas = (lote.estacas_enraizadas || 0) + qty + descartadas;
        const novas_sobreviventes = (lote.mudas_sobreviventes || 0) + qty;
        await base44.entities.Lote.update(form.lote_id, {
          estacas_enraizadas: novas_enraizadas,
          mudas_sobreviventes: novas_sobreviventes,
        });
        queryClient.invalidateQueries({ queryKey: ['lotes'] });

        // Registra as mudas descartadas como perda no setor de DESTINO (rustificação)
        if (descartadas > 0) {
          await base44.entities.Perda.create({
            lote_id: form.lote_id,
            clone_id: form.clone_id,
            setor_id: form.setor_destino_id,
            quantidade: descartadas,
            motivo: 'Descarte no enraizamento (transferência para rustificação)',
            data: form.data,
          });
          queryClient.invalidateQueries({ queryKey: ['perdas'] });
          toast.success(`Indicadores atualizados e ${descartadas} mudas descartadas registradas como perda no destino.`);
        } else {
          toast.success(`Indicadores do lote atualizados: ${novas_enraizadas} enraizadas, ${novas_sobreviventes} sobreviventes`);
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
    queryClient.invalidateQueries({ queryKey: ['producoes'] });
    queryClient.invalidateQueries({ queryKey: ['perdas'] });
    queryClient.invalidateQueries({ queryKey: ['lotes'] });
    setForm(emptyForm());
    setEditingId(null);
    setOpen(false);
  };

  const handleDelete = async (id) => {
    // Verifica se há perda associada (descarte no enraizamento)
    const mov = transferencias.find(m => m.id === id);
    if (mov) {
      const origemNome = setores.find(s => s.id === mov.setor_origem_id)?.nome?.toLowerCase() || '';
      const destinoNome = setores.find(s => s.id === mov.setor_destino_id)?.nome?.toLowerCase() || '';
      if (origemNome.includes('sombra') && destinoNome.includes('rustif')) {
        const perdaAssociada = perdas.find(p =>
          p.lote_id === mov.lote_id &&
          p.clone_id === mov.clone_id &&
          p.setor_id === mov.setor_destino_id &&
          p.data === mov.data &&
          p.motivo?.includes('Descarte no enraizamento')
        );
        if (perdaAssociada) {
          await base44.entities.Perda.delete(perdaAssociada.id);
        }
      }
    }
    await base44.entities.Movimentacao.delete(id);
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
    queryClient.invalidateQueries({ queryKey: ['producoes'] });
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
    { header: 'Origem', render: (row) => setorMap[row.setor_origem_id] || '—' },
    { header: 'Destino', render: (row) => setorMap[row.setor_destino_id] || '—' },
    { header: 'Quantidade', render: (row) => row.quantidade?.toLocaleString('pt-BR') },
  ];

  return (
    <div>
      <PageHeader
        title="Transferências"
        description="Movimentação entre setores"
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Transferência
          </Button>
        }
      />
      <DataTable columns={columns} data={transferencias} isLoading={isLoading} onDelete={handleDelete} onEdit={handleEdit} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Transferência' : 'Nova Transferência'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clone</Label>
              <Select value={form.clone_id} onValueChange={v => setForm({ ...form, clone_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lote</Label>
              <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor Origem</Label>
              <Select value={form.setor_origem_id} onValueChange={v => setForm({ ...form, setor_origem_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor Destino</Label>
              <Select value={form.setor_destino_id} onValueChange={v => setForm({ ...form, setor_destino_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {setores.filter(s => s.id !== form.setor_origem_id).map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isEnraizamentoTransfer && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                ⚠️ Transferência de <strong>Casa de Sombra → Rustificação</strong>: informe também as mudas descartadas para atualizar os indicadores de produção.
              </div>
            )}
            <div>
              <Label>Quantidade de Bandejas {disponivel > 0 && <span className="text-muted-foreground">(Disp: {disponivel} mudas)</span>}</Label>
              <Input
                type="number"
                value={form.bandejas}
                onChange={e => setForm({ ...form, bandejas: e.target.value, quantidade: e.target.value ? String(Number(e.target.value) * 187) : '' })}
                placeholder="Ex: 10"
              />
              {form.bandejas && (
                <p className="text-xs text-muted-foreground mt-1">{(Number(form.bandejas) * 187).toLocaleString('pt-BR')} mudas</p>
              )}
            </div>
            {isEnraizamentoTransfer && (
              <div>
                <Label>Mudas descartadas <span className="text-muted-foreground">(não transferidas)</span></Label>
                <Input type="number" value={form.descartadas} onChange={e => setForm({ ...form, descartadas: e.target.value })} placeholder="Ex: 50" />
                {form.quantidade && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Mudas enraizadas transferidas: <strong>{(Number(form.quantidade || 0) - Number(form.descartadas || 0)).toLocaleString('pt-BR')}</strong> · Total enraizadas registradas: {(Number(form.quantidade || 0) + Number(form.descartadas || 0)).toLocaleString('pt-BR')} ({Number(form.quantidade || 0).toLocaleString('pt-BR')} transferidas + {Number(form.descartadas || 0).toLocaleString('pt-BR')} descartadas)
                  </p>
                )}
              </div>
            )}
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditingId(null); setForm(emptyForm()); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.lote_id || !form.clone_id || !form.quantidade || !form.setor_origem_id || !form.setor_destino_id}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}