import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function BackupEstatisticas({ backups = [] }) {
  const stats = useMemo(() => {
    const backupsValidos = backups.filter(b => b.status === 'sucesso');

    if (backupsValidos.length === 0) {
      return {
        tempoMedio: 0,
        tamanhomedio: 0,
        backupsPorDia: [],
        distribuicaoTamanho: [],
      };
    }

    const tempoMedio = backupsValidos.reduce((sum, b) => sum + (b.tempo_execucao || 0), 0) / backupsValidos.length;
    const tamanhoMedio = backupsValidos.reduce((sum, b) => sum + (b.tamanho_arquivo || 0), 0) / backupsValidos.length;

    // Agrupar por dia
    const porDia = {};
    backupsValidos.forEach(b => {
      const dia = new Date(b.data_hora).toLocaleDateString('pt-BR');
      porDia[dia] = (porDia[dia] || 0) + 1;
    });

    const backupsPorDia = Object.entries(porDia).map(([dia, count]) => ({
      dia,
      backups: count,
    }));

    return {
      tempoMedio,
      tamanhoMedio,
      backupsPorDia,
      totalBackups: backupsValidos.length,
    };
  }, [backups]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tempo Médio</p>
          <p className="text-2xl font-bold text-primary">{stats.tempoMedio.toFixed(1)}s</p>
          <p className="text-xs text-muted-foreground mt-1">por execução</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tamanho Médio</p>
          <p className="text-2xl font-bold text-primary">{stats.tamanhoMedio.toFixed(1)}MB</p>
          <p className="text-xs text-muted-foreground mt-1">por backup</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total de Backups</p>
          <p className="text-2xl font-bold text-primary">{stats.totalBackups}</p>
          <p className="text-xs text-muted-foreground mt-1">com sucesso</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Política de Retenção</p>
          <p className="text-sm font-medium text-foreground">✓ Ativa</p>
          <p className="text-xs text-muted-foreground mt-1">7 diários • 4 semanais • 3 mensais</p>
        </CardContent>
      </Card>
    </div>
  );
}