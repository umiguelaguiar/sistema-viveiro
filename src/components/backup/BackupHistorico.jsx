import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function BackupHistorico({ backups = [], carregando }) {
  const backupsOrdenados = useMemo(() => {
    return [...backups].sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
  }, [backups]);

  const getStatusBadge = (status) => {
    const configs = {
      sucesso: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      erro: { variant: 'destructive', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      parcial: { variant: 'secondary', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
    };
    return configs[status] || configs.sucesso;
  };

  const getTipoBadge = (tipo) => {
    return tipo === 'automatico' ? 'Automático' : 'Manual';
  };

  if (carregando) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground">Carregando backups...</p>
        </CardContent>
      </Card>
    );
  }

  if (backupsOrdenados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum backup encontrado. Gere um novo backup para começar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Backups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {backupsOrdenados.map((backup) => (
            <div
              key={backup.id}
              className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">
                  {backup.status === 'sucesso' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {backup.status === 'erro' && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  {backup.status === 'parcial' && (
                    <Clock className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-medium text-sm truncate">{backup.nome_arquivo}</p>
                    <Badge variant="outline" className="text-xs">{getTipoBadge(backup.tipo_backup)}</Badge>
                    <Badge className={getStatusBadge(backup.status).className}>
                      {backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>{format(new Date(backup.data_hora), 'dd MMM yyyy HH:mm', { locale: pt })}</span>
                    {backup.tamanho_arquivo && <span>{backup.tamanho_arquivo.toFixed(2)} MB</span>}
                    {backup.tempo_execucao && <span>{backup.tempo_execucao}s</span>}
                    {backup.local_armazenamento && (
                      <span className="capitalize">📍 {backup.local_armazenamento.replace('_', ' ')}</span>
                    )}
                  </div>
                  {backup.descricao_erro && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{backup.descricao_erro}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {backup.link_arquivo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-8"
                    onClick={() => window.open(backup.link_arquivo, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}