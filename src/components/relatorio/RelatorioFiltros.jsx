import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Filter } from 'lucide-react';

export default function RelatorioFiltros({ mes, setMes, cloneFiltro, setCloneFiltro, loteFiltro, setLoteFiltro, setorFiltro, setSetorFiltro, clones, lotes, setores, mesesDisponiveis }) {
  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Filtros</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {mesesDisponiveis.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cloneFiltro} onValueChange={setCloneFiltro}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Clone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clones</SelectItem>
            {clones.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo_clone}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={loteFiltro} onValueChange={setLoteFiltro}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Lote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os lotes</SelectItem>
            {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={setorFiltro} onValueChange={setSetorFiltro}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}