import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import BackupHeader from '@/components/backup/BackupHeader';
import BackupActions from '@/components/backup/BackupActions';
import BackupEstatisticas from '@/components/backup/BackupEstatisticas';
import BackupHistorico from '@/components/backup/BackupHistorico';
import { useAuth } from '@/lib/AuthContext';

export default function BackupPage() {
  const { user } = useAuth();
  const [statusExterno, setStatusExterno] = useState('inativo');

  // Verificar se é administrador
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem acessar o módulo de backup.</p>
        </div>
      </div>
    );
  }

  // Buscar backups
  const { data: backups = [], isLoading, refetch } = useQuery({
    queryKey: ['backups-sistema'],
    queryFn: () => base44.entities.BackupSistema.list('-data_hora', 100),
    staleTime: 30000,
  });

  const ultimoBackup = backups?.[0];

  // Verificar conexão com armazenamento externo (simulado)
  useEffect(() => {
    // Aqui você implementaria a verificação real de conexão
    setStatusExterno('inativo');
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <PageHeader
        title="Gestão de Backup & Restauração"
        description="Crie backups completos do sistema, configure armazenamento externo e restaure dados com segurança."
      />

      <BackupHeader ultimoBackup={ultimoBackup} statusExterno={statusExterno} />

      <BackupActions onBackupCompleto={() => refetch()} />

      <BackupEstatisticas backups={backups} />

      <BackupHistorico backups={backups} carregando={isLoading} />

      {/* Seção de Configuração de Armazenamento Externo */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">🔌 Armazenamento Externo</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
          Configure uma conexão com Google Drive ou AWS S3 para armazenar backups remotamente.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Configurar Armazenamento Externo
        </button>
      </div>
    </div>
  );
}