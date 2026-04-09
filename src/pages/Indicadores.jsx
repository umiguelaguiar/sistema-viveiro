import React, { useMemo, useState } from 'react';
import { useMovimentacoes, useSetores, useClones, usePerdas, useLotes } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function calcTaxa(numerador, denominador) {
  if (!denominador || denominador === 0) return 0;
  return parseFloat(((numerador / denominador) * 100).toFixed(1));
}

function classificar(valor, thresholds) {
  if (valor >= thresholds[1]) return 'Ótimo';
  if (valor >= thresholds[0]) return 'Médio';
  return 'Ruim';
}

const STATUS_COLORS = {
  Ótimo: { card: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', text: 'text-green-700' },
  Médio: { card: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700' },
  Ruim: { card: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', text: 'text-red-700' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Ruim;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>{status}</span>;
}

function avg(arr) {
  if (!arr.length) return 0;
  return parseFloat((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1));
}

export default function Indicadores() {
  const { data: movimentacoes = [] } = useMovimentacoes();
  const { data: setores = [] } = useSetores();
  const { data: clones = [] } = useClones();
  const { data: perdas = [] } = usePerdas();
  const { data: lotes = [] } = useLotes();
  const [anoFiltro, setAnoFiltro] = useState('todos');

  const loteMap = useMemo(() => Object.fromEntries(lotes.map(l => [l.id, l])), [lotes]);
  const cloneMap = useMemo(() => Object.fromEntries(clones.map(c => [c.id, c])), [clones]);

  const transferEnraizamento = useMemo(() => {
    const transfs = movimentacoes.filter(m => {
      if (m.tipo !== 'transferencia') return false;
      const origemNome = setores.find(s => s.id === m.setor_origem_id)?.nome?.toLowerCase() || '';
      const destinoNome = setores.find(s => s.id === m.setor_destino_id)?.nome?.toLowerCase() || '';
      return origemNome.includes('sombra') && destinoNome.includes('rustif');
    });

    return transfs.map(t => {
      const perdaAssoc = perdas.find(p =>
        p.lote_id === t.lote_id && p.clone_id === t.clone_id &&
        p.setor_id === t.setor_destino_id && p.data === t.data &&
        p.motivo?.includes('Descarte no enraizamento')
      );
      const descartadas = perdaAssoc?.quantidade || 0;
      const transferidas = t.quantidade;
      const enraizadas = transferidas - descartadas;
      // % Enraizamento = (transferidas - descartadas) / transferidas
      const taxa_enraizamento = calcTaxa(transferidas - descartadas, transferidas);
      // % Sobrevivência = transferidas / enraizadas
      const taxa_sobrevivencia = calcTaxa(transferidas, enraizadas);
      return {
        ...t,
        lote: loteMap[t.lote_id],
        clone: cloneMap[t.clone_id],
        descartadas,
        enraizadas,
        transferidas,
        taxa_enraizamento,
        taxa_sobrevivencia,
        status_enraizamento: classificar(taxa_enraizamento, [60, 80]),
        status_sobrevivencia: classificar(taxa_sobrevivencia, [85, 92]),
      };
    });
  }, [movimentacoes, setores, perdas, loteMap, cloneMap]);

  const anosOptions = useMemo(() => {
    const anos = new Set(transferEnraizamento.filter(t => t.data).map(t => t.data.substring(0, 4)));
    return Array.from(anos).sort().reverse();
  }, [transferEnraizamento]);

  const transferFiltradas = useMemo(() => anoFiltro === 'todos'
    ? transferEnraizamento
    : transferEnraizamento.filter(t => t.data?.startsWith(anoFiltro)),
  [transferEnraizamento, anoFiltro]);

  const mediaEnraiz = avg(transferFiltradas.map(t => t.taxa_enraizamento));
  const mediaSobrev = avg(transferFiltradas.map(t => t.taxa_sobrevivencia));

  const KpiCard = ({ label, valor, thresholds }) => {
    const status = classificar(valor, thresholds);
    const c = STATUS_COLORS[status];
    return (
      <Card className={`p-5 border ${c.card}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
        <p className={`text-4xl font-bold ${c.text}`}>{valor}%</p>
        <div className="mt-2"><StatusBadge status={status} /></div>
        <p className="text-xs text-muted-foreground mt-1">{transferFiltradas.length} transferências</p>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Indicadores de Produção" description="Análise por transferência (Casa de Sombra → Rustificação)" />

      {/* Filtro */}
      <div className="flex flex-wrap gap-3">
        <Select value={anoFiltro} onValueChange={setAnoFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os anos</SelectItem>
            {anosOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Média Enraizamento" valor={mediaEnraiz} thresholds={[60, 80]} />
        <KpiCard label="Média Sobrevivência" valor={mediaSobrev} thresholds={[85, 92]} />
        <Card className="p-5 border bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total Transferências</p>
          <p className="text-4xl font-bold">{transferFiltradas.length}</p>
        </Card>
        <Card className="p-5 border bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total Descartadas</p>
          <p className="text-4xl font-bold text-red-600">{transferFiltradas.reduce((s, t) => s + t.descartadas, 0).toLocaleString('pt-BR')}</p>
        </Card>
      </div>

      {/* Tabela */}
      {transferFiltradas.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Nenhuma transferência de Casa de Sombra → Rustificação encontrada.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lote</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clone</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transferidas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descartadas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enraizadas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">% Enraizamento</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">% Sobrevivência</th>
                </tr>
              </thead>
              <tbody>
                {transferFiltradas.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{row.data ? row.data.split('-').reverse().join('/') : '—'}</td>
                    <td className="px-4 py-3 font-semibold">{row.lote?.codigo || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.clone?.codigo_clone || '—'}</td>
                    <td className="px-4 py-3 text-right">{row.transferidas.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right text-red-600">{row.descartadas.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.enraizadas.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${STATUS_COLORS[row.status_enraizamento].text}`}>{row.taxa_enraizamento}%</span>
                        <StatusBadge status={row.status_enraizamento} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${STATUS_COLORS[row.status_sobrevivencia].text}`}>{row.taxa_sobrevivencia}%</span>
                        <StatusBadge status={row.status_sobrevivencia} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}