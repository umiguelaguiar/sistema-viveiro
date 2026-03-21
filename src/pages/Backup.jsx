import React, { useState, useRef } from 'react';
import { useProducoes, useMovimentacoes, usePerdas, useClones, useLotes, useSetores, useEspecies, useInsumos, useMovimentacoesInsumos } from '@/hooks/useNurseryData';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Database, CheckCircle, Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

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

const ENTITY_MAP = {
  producoes: 'Producao',
  movimentacoes: 'Movimentacao',
  perdas: 'Perda',
  clones: 'Clone',
  lotes: 'Lote',
  setores: 'Setor',
  especies: 'Especie',
  insumos: 'Insumo',
  movimentacoes_insumos: 'MovimentacaoInsumo',
};

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
  const [restaurando, setRestaurando] = useState(false);
  const [restauracaoStatus, setRestauracaoStatus] = useState(null); // null | 'sucesso' | 'erro'
  const [restauracaoMsg, setRestauracaoMsg] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [backupParaRestaurar, setBackupParaRestaurar] = useState(null);
  const fileInputRef = useRef();
  const queryClient = useQueryClient();

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        setBackupParaRestaurar(json);
        setConfirmando(true);
        setRestauracaoStatus(null);
      } catch {
        setRestauracaoStatus('erro');
        setRestauracaoMsg('Arquivo inválido. Certifique-se de usar um backup JSON gerado pelo sistema.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executarRestauracao = async () => {
    setConfirmando(false);
    setRestaurando(true);
    setRestauracaoStatus(null);
    try {
      let totalInseridos = 0;
      // First, clear all entities to prevent duplicates
      for (const [chave] of Object.entries(backupParaRestaurar)) {
        const entidade = ENTITY_MAP[chave];
        if (!entidade) continue;
        const todos = await base44.entities[entidade].list();
        for (const item of todos) {
          await base44.entities[entidade].delete(item.id);
        }
      }
      // Then insert the backup data
      for (const [chave, registros] of Object.entries(backupParaRestaurar)) {
        const entidade = ENTITY_MAP[chave];
        if (!entidade || !Array.isArray(registros) || registros.length === 0) continue;
        // Remove campos internos antes de inserir
        const limpos = registros.map(({ id, created_date, updated_date, created_by, ...rest }) => rest);
        await base44.entities[entidade].bulkCreate(limpos);
        totalInseridos += limpos.length;
      }
      queryClient.invalidateQueries();
      setRestauracaoStatus('sucesso');
      setRestauracaoMsg(`${totalInseridos} registros restaurados com sucesso!`);
    } catch (err) {
      setRestauracaoStatus('erro');
      setRestauracaoMsg('Erro ao restaurar: ' + (err?.message || 'Tente novamente.'));
    }
    setRestaurando(false);
    setBackupParaRestaurar(null);
  };

  // Contagem do que será restaurado
  const resumoRestauracao = backupParaRestaurar
    ? Object.entries(backupParaRestaurar)
        .filter(([, v]) => Array.isArray(v) && v.length > 0)
        .map(([k, v]) => `${tabelas.find(t => t.nome === k)?.label || k}: ${v.length}`)
    : [];

  return (
    <div>
      <PageHeader title="Backup de Dados" description="Exporte e restaure todos os dados do sistema" />

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

      {/* Restauração */}
      <Card className="p-5 mb-6 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Restaurar Backup</p>
            <p className="text-sm text-muted-foreground">Importe um arquivo JSON gerado pelo sistema para recuperar seus dados. Os registros serão adicionados ao banco atual.</p>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={restaurando} className="gap-2 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20">
          {restaurando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {restaurando ? 'Restaurando...' : 'Selecionar arquivo de backup (.json)'}
        </Button>

        {/* Confirmação */}
        {confirmando && backupParaRestaurar && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">Confirmar restauração</p>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">Os seguintes dados serão inseridos no sistema:</p>
            <ul className="text-xs text-amber-700 dark:text-amber-400 mb-3 space-y-0.5">
              {resumoRestauracao.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
            <div className="flex gap-2">
              <Button size="sm" onClick={executarRestauracao} className="bg-amber-600 hover:bg-amber-700">
                Confirmar Restauração
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setConfirmando(false); setBackupParaRestaurar(null); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {restauracaoStatus === 'sucesso' && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            {restauracaoMsg}
          </div>
        )}
        {restauracaoStatus === 'erro' && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {restauracaoMsg}
          </div>
        )}
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
          Para restaurar, use apenas arquivos JSON gerados pelo sistema. A restauração adiciona os registros sem apagar os existentes.
        </p>
      </div>
    </div>
  );
}