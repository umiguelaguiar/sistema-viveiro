import React, { useState } from 'react';
import { useProducoes, useMovimentacoes, usePerdas, useClones, useLotes, useSetores, useEspecies, useInsumos, useMovimentacoesInsumos } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Database, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

function baixarJSON(dados, nome) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nome}_${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function baixarCSV(dados, nome) {
  if (!dados.length) return;
  const keys = Object.keys(dados[0]);
  const csv = [keys.join(','), ...dados.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nome}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Backup() {
  const { data: producoes } = useProducoes();
  const { data: movimentacoes } = useMovimentacoes();
  const { data: perdas } = usePerdas();
  const { data: clones } = useClones();
  const { data: lotes } = useLotes();
  const { data: setores } = useSetores();
  const { data: especies } = useEspecies();
  const { data: insumos } = useInsumos();
  const { data: movInsumos } = useMovimentacoesInsumos();
  const [exportando, setExportando] = useState(false);
  const [ultimoBackup, setUltimoBackup] = useState(localStorage.getItem('ultimo_backup') || null);

  const tabelas = [
    { nome: 'producoes', dados: producoes, label: 'Produções' },
    { nome: 'movimentacoes', dados: movimentacoes, label: 'Movimentações' },
    { nome: 'perdas', dados: perdas, label: 'Perdas' },
    { nome: 'clones', dados: clones, label: 'Clones' },
    { nome: 'lotes', dados: lotes, label: 'Lotes' },
    { nome: 'setores', dados: setores, label: 'Setores' },
    { nome: 'especies', dados: especies, label: 'Espécies' },
    { nome: 'insumos', dados: insumos, label: 'Insumos' },
    { nome: 'movimentacoes_insumos', dados: movInsumos, label: 'Mov. Insumos' },
  ];

  const totalRegistros = tabelas.reduce((s, t) => s + (t.dados?.length || 0), 0);

  const exportarTudo = (formato) => {
    setExportando(true);
    const agora = format(new Date(), 'yyyy-MM-dd');
    setTimeout(() => {
      if (formato === 'json') {
        const backup = {};
        tabelas.forEach(t => { backup[t.nome] = t.dados; });
        baixarJSON(backup, 'viveiro_backup_completo');
      } else {
        tabelas.forEach(t => {
          if (t.dados?.length) baixarCSV(t.dados, t.nome);
        });
      }
      localStorage.setItem('ultimo_backup', new Date().toISOString());
      setUltimoBackup(new Date().toISOString());
      setExportando(false);
    }, 300);
  };

  return (
    <div>
      <PageHeader title="Backup de Dados" description="Exporte e proteja todos os dados do sistema" />

      {/* Status */}
      <Card className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Status do Sistema</p>
              <p className="text-sm text-muted-foreground">{totalRegistros.toLocaleString('pt-BR')} registros totais</p>
              {ultimoBackup && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Último backup: {format(new Date(ultimoBackup), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportarTudo('json')} disabled={exportando} className="gap-2">
              <Download className="w-4 h-4" />
              Backup JSON
            </Button>
            <Button variant="outline" onClick={() => exportarTudo('csv')} disabled={exportando} className="gap-2">
              <Download className="w-4 h-4" />
              Backup CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabelas individuais */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Exportar por Tabela</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tabelas.map(t => (
          <Card key={t.nome} className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">{t.label}</p>
              <Badge variant="secondary" className="text-xs mt-1">{(t.dados?.length || 0)} registros</Badge>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => baixarJSON(t.dados, t.nome)} title="JSON">
                <Download className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => baixarCSV(t.dados, t.nome)} title="CSV">
                <span className="text-xs">CSV</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Faça backups regulares antes de inserir grandes volumes de dados.
          O arquivo JSON contém todos os dados em um único arquivo, ideal para restauração completa.
          O CSV é útil para análise em planilhas como Excel.
        </p>
      </div>
    </div>
  );
}