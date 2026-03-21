import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BackupActions({ onBackupCompleto }) {
  const [carregando, setCarregando] = useState(false);
  const [tipoBackup, setTipoBackup] = useState('manual');

  const gerarBackup = async () => {
    if (!confirm('Deseja gerar um novo backup do sistema?')) return;

    setCarregando(true);
    try {
      const resultado = await base44.backend.gerar_backup_completo({
        tipo_backup: tipoBackup,
      });

      if (resultado.sucesso) {
        toast.success('Backup gerado com sucesso!');
        onBackupCompleto?.();
      } else {
        toast.error(resultado.erro || 'Erro ao gerar backup');
      }
    } catch (erro) {
      toast.error('Erro ao gerar backup: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Gerar Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Gerar Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cria uma cópia completa de todos os dados do sistema com compactação e validação de integridade.
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="manual"
                checked={tipoBackup === 'manual'}
                onChange={(e) => setTipoBackup(e.target.value)}
                className="rounded"
              />
              <span className="text-sm">Backup apenas local</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="completo"
                checked={tipoBackup === 'completo'}
                onChange={(e) => setTipoBackup(e.target.value)}
                className="rounded"
              />
              <span className="text-sm">Backup + envio para armazenamento externo</span>
            </label>
          </div>

          <Button
            onClick={gerarBackup}
            disabled={carregando}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {carregando ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gerando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Gerar Backup Agora
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Restaurar Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Restaurar Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Restaura o sistema a partir de um backup anterior. Esta ação substituirá todos os dados atuais.
          </p>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">Atenção!</p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                Um backup automático será criado antes da restauração. Esta ação não poderá ser desfeita.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Selecionar Backup para Restaurar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}