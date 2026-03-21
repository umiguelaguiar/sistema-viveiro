import React from 'react';
import { HardDrive, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function BackupHeader({ ultimoBackup, statusExterno }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'sucesso':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'erro':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'parcial':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
      default:
        return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'erro':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <HardDrive className="w-5 h-5" />;
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <HardDrive className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Backup & Restauração</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Último Backup</p>
            {ultimoBackup ? (
              <div className="space-y-2">
                <div className={`flex items-center gap-2 p-2 rounded-lg ${getStatusColor(ultimoBackup.status)}`}>
                  {getStatusIcon(ultimoBackup.status)}
                  <span className="font-medium capitalize">{ultimoBackup.status}</span>
                </div>
                <p className="text-sm text-foreground">{new Date(ultimoBackup.data_hora).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{ultimoBackup.tamanho_arquivo?.toFixed(2)} MB</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum backup realizado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Armazenamento Externo</p>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 p-2 rounded-lg ${statusExterno === 'ativo' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-slate-600 bg-slate-50 dark:bg-slate-900/20'}`}>
                {statusExterno === 'ativo' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="font-medium capitalize">{statusExterno === 'ativo' ? 'Conectado' : 'Desconectado'}</span>
              </div>
              <p className="text-xs text-muted-foreground">Configure nas configurações do sistema</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total de Backups</p>
            <p className="text-3xl font-bold text-primary mb-2">{ultimoBackup ? '...' : '0'}</p>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}