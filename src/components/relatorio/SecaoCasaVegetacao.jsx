import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { differenceInDays, parseISO, startOfWeek, addDays, format } from 'date-fns';
import { Sprout, Clock, Calendar } from 'lucide-react';

const COR_BARRA = 'hsl(152, 55%, 28%)';

function ResumoCard({ icon: Icon, label, valor, unidade, cor }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${cor} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground leading-tight">
            {valor}
            {unidade && <span className="text-sm font-normal text-muted-foreground ml-1">{unidade}</span>}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function SecaoCasaVegetacao({ producoes, movimentacoes, perdas, setores, clones, lotes }) {
  const dados = useMemo(() => {
    const cv = setores.find(s => s.nome?.toLowerCase().includes('vegeta'));
    if (!cv) return { coortes: [], totalMudas: 0, mediaGeral: 0, maisAntiga: 0, maisRecente: 0 };

    const cloneMap = Object.fromEntries(clones.map(c => [c.id, c.codigo_clone]));
    const loteMap = Object.fromEntries(lotes.map(l => [l.id, l.codigo]));

    const entradas = producoes.filter(p => p.setor_id === cv.id);
    const saidas = movimentacoes.filter(m => m.setor_origem_id === cv.id);
    const descartes = perdas.filter(p => p.setor_id === cv.id);

    // Todos os pares clone + lote com histórico no setor
    const chaves = new Set();
    [...entradas, ...saidas, ...descartes].forEach(r => {
      if (r.clone_id && r.lote_id) chaves.add(`${r.clone_id}|${r.lote_id}`);
    });

    const hoje = new Date();
    const restantes = [];

    chaves.forEach(chave => {
      const [cloneId, loteId] = chave.split('|');

      // Linha do tempo: entradas (produção) e saídas (transferência, expedição e perdas)
      const eventos = [
        ...entradas.filter(p => p.clone_id === cloneId && p.lote_id === loteId)
          .map(p => ({ tipo: 'entrada', data: p.data, qtd: p.quantidade || 0 })),
        ...saidas.filter(m => m.clone_id === cloneId && m.lote_id === loteId)
          .map(m => ({ tipo: 'saida', data: m.data, qtd: m.quantidade || 0 })),
        ...descartes.filter(p => p.clone_id === cloneId && p.lote_id === loteId)
          .map(p => ({ tipo: 'saida', data: p.data, qtd: p.quantidade || 0 })),
      ].sort((a, b) => (a.data || '').localeCompare(b.data || ''));

      // Consome primeiro o que entrou primeiro, para saber quando as mudas que restaram entraram
      const fila = [];
      eventos.forEach(e => {
        if (e.tipo === 'entrada') {
          fila.push({ data: e.data, qtd: e.qtd });
        } else {
          let resta = e.qtd;
          while (resta > 0 && fila.length > 0) {
            const item = fila[0];
            const usa = Math.min(item.qtd, resta);
            item.qtd -= usa;
            resta -= usa;
            if (item.qtd <= 0) fila.shift();
          }
        }
      });

      fila.filter(f => f.qtd > 0 && f.data).forEach(f => {
        restantes.push({
          cloneNome: cloneMap[cloneId] || '—',
          loteNome: loteMap[loteId] || '—',
          data: f.data,
          qtd: f.qtd,
          dias: differenceInDays(hoje, parseISO(f.data)),
        });
      });
    });

    // Agrupa pela semana em que as mudas entraram na casa de vegetação
    const porSemana = {};
    restantes.forEach(r => {
      const inicio = startOfWeek(parseISO(r.data), { weekStartsOn: 1 });
      const chave = format(inicio, 'yyyy-MM-dd');
      if (!porSemana[chave]) {
        porSemana[chave] = { inicio, mudas: 0, somaDias: 0, lotes: new Set(), maisAntiga: r.dias, maisRecente: r.dias };
      }
      const s = porSemana[chave];
      s.mudas += r.qtd;
      s.somaDias += r.qtd * r.dias;
      s.lotes.add(`${r.loteNome}-${r.cloneNome}`);
      s.maisAntiga = Math.max(s.maisAntiga, r.dias);
      s.maisRecente = Math.min(s.maisRecente, r.dias);
    });

    const coortes = Object.values(porSemana).map(s => ({
      inicio: s.inicio,
      label: `${format(s.inicio, 'dd/MM')} a ${format(addDays(s.inicio, 6), 'dd/MM')}`,
      mudas: s.mudas,
      lotes: s.lotes.size,
      mediaDias: s.somaDias / s.mudas,
      maisAntiga: s.maisAntiga,
      maisRecente: s.maisRecente,
    })).sort((a, b) => a.inicio - b.inicio);

    const totalMudas = restantes.reduce((s, r) => s + r.qtd, 0);
    const mediaGeral = totalMudas > 0 ? restantes.reduce((s, r) => s + r.qtd * r.dias, 0) / totalMudas : 0;
    const dias = restantes.map(r => r.dias);

    return {
      coortes,
      totalMudas,
      mediaGeral,
      maisAntiga: dias.length ? Math.max(...dias) : 0,
      maisRecente: dias.length ? Math.min(...dias) : 0,
    };
  }, [producoes, movimentacoes, perdas, setores, clones, lotes]);

  if (dados.totalMudas === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Nenhuma muda está na Casa de Vegetação no momento.
      </Card>
    );
  }

  const grafico = dados.coortes.map(c => ({ label: c.label, mediaDias: Number(c.mediaDias.toFixed(1)) }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Tempo das Mudas na Casa de Vegetação</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Média de dias de permanência das mudas que estão hoje no setor, agrupadas pela semana em que entraram.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResumoCard icon={Sprout} label="Mudas na Casa de Vegetação" valor={dados.totalMudas.toLocaleString('pt-BR')} cor="bg-green-100 text-green-700" />
        <ResumoCard icon={Clock} label="Média de Dias no Setor" valor={dados.mediaGeral.toFixed(1)} unidade="dias" cor="bg-amber-100 text-amber-700" />
        <ResumoCard icon={Calendar} label="Semanas de Entrada" valor={dados.coortes.length} unidade="semanas" cor="bg-blue-100 text-blue-700" />
        <ResumoCard icon={Clock} label="Permanência Mais Antiga" valor={dados.maisAntiga} unidade="dias" cor="bg-red-100 text-red-700" />
      </div>

      <Card className="p-6">
        <h3 className="text-base font-semibold mb-1">Média de Dias por Semana de Entrada</h3>
        <p className="text-sm text-muted-foreground mb-4">Quanto mais antiga a semana de entrada, maior o tempo de permanência no setor</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={grafico} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} unit="d" />
            <Tooltip formatter={(v) => [`${v} dias`, 'Média de permanência']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="mediaDias" name="Média de permanência (dias)" fill={COR_BARRA} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semana de Entrada</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mudas Hoje</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Média de Dias</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lotes / Clones</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faixa (dias)</th>
              </tr>
            </thead>
            <tbody>
              {dados.coortes.map((c, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.label}</td>
                  <td className="px-4 py-3 text-right">{c.mudas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{c.mediaDias.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{c.lotes}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{c.maisRecente} a {c.maisAntiga}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td className="px-4 py-3 font-semibold">Total</td>
                <td className="px-4 py-3 text-right font-semibold">{dados.totalMudas.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3 text-right font-bold text-primary">{dados.mediaGeral.toFixed(1)}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-center text-muted-foreground">{dados.maisRecente} a {dados.maisAntiga}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}