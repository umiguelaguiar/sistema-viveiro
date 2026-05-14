import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Database, CheckCircle, AlertTriangle, RefreshCw, Trash2, Clock, HardDrive, Activity } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Backup() {
  const queryClient = useQueryClient();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [backupSelecionado, setBackupSelecionado] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  // Buscar histórico de backups
  const { data: backups = [], isLoading: carregandoBackups } = useQuery({
    queryKey: ['backups_sistema'],
    queryFn: () => base44.entities.BackupSistema.list('-data_hora', 100),
  });

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!backups.length) return { ultimoBackup: null, media: 0, tamanhoTotal: 0, erros: 0 };

    const sucessos = backups.filter(b => b.status === 'sucesso');
    const ultimoBackup = sucessos[0] || null;
    const temposExecucao = sucessos.map(b => b.tempo_execucao || 0);
    const media = temposExecucao.length > 0 ? (temposExecucao.reduce((a, b) => a + b) / temposExecucao.length).toFixed(2) : 0;
    const tamanhoTotal = sucessos.reduce((s, b) => s + (b.tamanho_arquivo || 0), 0).toFixed(2);
    const erros = backups.filter(b => b.status === 'erro').length;

    return { ultimoBackup, media, tamanhoTotal, erros };
  }, [backups]);

  // Gerar backup
  const mutationGerar = useMutation({
    mutationFn: async () => {
      setGerando(true);
      const resposta = await base44.functions.invoke('gerarBackupCompleto', {});
      return resposta.data;
    },
    onSuccess: (data) => {
      if (data.sucesso) {
        toast.success('Backup gerado com sucesso!');
        const jsonStr = data.dados;
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.backup.nome_arquivo;
        a.click();
        URL.revokeObjectURL(url);
        queryClient.invalidateQueries({ queryKey: ['backups_sistema'] });
      } else {
        toast.error('Erro ao gerar backup: ' + data.erro);
      }
      setGerando(false);
    },
    onError: (error) => {
      toast.error('Erro ao gerar backup: ' + error.message);
      setGerando(false);
    }
  });

  const [arquivoRestauracao, setArquivoRestauracao] = useState(null);
  const [dadosRestauracao, setDadosRestauracao] = useState(null);

  const handleArquivoSelecionado = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArquivoRestauracao(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        setDadosRestauracao(dados);
      } catch {
        toast.error('Arquivo inválido - não é um JSON válido');
        setArquivoRestauracao(null);
      }
    };
    reader.readAsText(file);
  };

  // Restaurar backup
  const mutationRestaurar = useMutation({
    mutationFn: async () => {
      setRestaurando(true);
      const resposta = await base44.functions.invoke('restaurarBackup', {
        jsonDados: dadosRestauracao,
        hashValidacao: backupSelecionado?.hash_integridade || null,
        backupIdOrigemRestauracao: backupSelecionado?.id || null
      });
      return resposta.data;
    },
    onSuccess: (data) => {
      if (data.sucesso) {
        toast.success('Backup restaurado com sucesso! ' + data.totalRestaurados + ' registros');
        setConfirmDialogOpen(false);
        setArquivoRestauracao(null);
        setDadosRestauracao(null);
        setBackupSelecionado(null);
        queryClient.invalidateQueries({ queryKey: ['backups_sistema'] });
      } else {
        toast.error('Erro ao restaurar: ' + data.erro);
      }
      setRestaurando(false);
    },
    onError: (error) => {
      toast.error('Erro ao restaurar: ' + error.message);
      setRestaurando(false);
    }
  });

  const iniciarRestauracao = (backup) => {
    setBackupSelecionado(backup);
    setArquivoRestauracao(null);
    setDadosRestauracao(null);
    setConfirmDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Backup e Restauração"
        description="Gerenciamento avançado de backups com segurança e redundância"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setBackupSelecionado(null); setArquivoRestauracao(null); setDadosRestauracao(null); setConfirmDialogOpen(true); }} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Restaurar Arquivo
            </Button>
            <Button onClick={() => mutationGerar.mutate()} disabled={gerando} className="gap-2">
              {gerando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {gerando ? 'Gerando...' : 'Gerar Backup Completo'}
            </Button>
          </div>
        }
      />

      {/* Dashboard de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Último Backup</p>
                <p className="text-sm font-semibold mt-1">
                  {stats.ultimoBackup
                    ? format(new Date(stats.ultimoBackup.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : 'Nenhum'}
                </p>
                {stats.ultimoBackup && (
                  <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Sucesso
                  </p>
                )}
              </div>
              <Clock className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tempo Médio</p>
                <p className="text-2xl font-bold mt-1">{stats.media}s</p>
                <p className="text-xs text-muted-foreground mt-0.5">de execução</p>
              </div>
              <RefreshCw className="w-8 h-8 text-amber-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Armazenado</p>
                <p className="text-2xl font-bold mt-1">{stats.tamanhoTotal} MB</p>
                <p className="text-xs text-muted-foreground mt-0.5">em backups</p>
              </div>
              <HardDrive className="w-8 h-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Erros</p>
                <p className="text-2xl font-bold mt-1">{stats.erros}</p>
                <p className="text-xs text-muted-foreground mt-0.5">de {backups.length} backups</p>
              </div>
              <Activity className="w-8 h-8" style={{ color: stats.erros > 0 ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Política de Retenção */}
      <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-300">Política de Retenção Automática</p>
              <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
                O sistema mantém automaticamente: últimos 7 backups diários, 4 semanais e 3 mensais. Backups mais antigos são removidos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Backups</CardTitle>
        </CardHeader>
        <CardContent>
          {carregandoBackups ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : backups.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Database className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum backup registrado ainda</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {backups.map(backup => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{backup.nome_arquivo}</p>
                      <Badge variant={backup.status === 'sucesso' ? 'default' : 'destructive'} className="text-xs">
                        {backup.status === 'sucesso' ? '✓' : '✕'} {backup.status}
                      </Badge>
                      {backup.tipo_backup === 'automático' && (
                        <Badge variant="outline" className="text-xs">Automático</Badge>
                      )}
                      {backup.restaurado && (
                        <Badge variant="secondary" className="text-xs">Restaurado</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground mt-2">
                      <div>
                        <p className="font-semibold text-foreground">{backup.total_registros || 0}</p>
                        <p>registros</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{backup.tamanho_arquivo || 0} MB</p>
                        <p>tamanho</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{backup.tempo_execucao || 0}s</p>
                        <p>tempo</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {formatDistance(new Date(backup.data_hora), new Date(), { locale: ptBR })}
                        </p>
                        <p>atrás</p>
                      </div>
                    </div>
                    {backup.descricao_erro && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {backup.descricao_erro}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {backup.status === 'sucesso' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => iniciarRestauracao(backup)}
                        disabled={restaurando}
                        title="Restaurar este backup"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Restauração */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Restauração
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível e substituirá todos os dados atuais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-semibold text-red-900 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {backupSelecionado ? `Referência: backup de ${format(new Date(backupSelecionado.data_hora), 'dd/MM/yyyy HH:mm', { locale: ptBR })}` : 'Restauração por arquivo'}
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                  • Um backup de segurança automático dos dados atuais será criado antes de restaurar
                </p>
                <p className="text-xs text-red-700 dark:text-red-400">
                  • Todos os dados atuais serão substituídos pelos dados do arquivo de backup
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Selecione o arquivo de backup (.json):</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleArquivoSelecionado}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
                {arquivoRestauracao && dadosRestauracao && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Arquivo válido: {arquivoRestauracao.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setConfirmDialogOpen(false); setArquivoRestauracao(null); setDadosRestauracao(null); }}
                  disabled={restaurando}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => mutationRestaurar.mutate()}
                  disabled={restaurando || !dadosRestauracao}
                  className="flex-1 gap-2"
                >
                  {restaurando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Confirmar Restauração
                    </>
                  )}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="mt-6 bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Informações:</strong> Backups são gerados com hash SHA-256 para validação de integridade.
            A restauração cria automaticamente um backup de segurança dos dados atuais para proteção.
            Apenas administradores podem gerar ou restaurar backups.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}