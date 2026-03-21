import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar todos os backups ordenados por data
    const todosBackups = await base44.asServiceRole.entities.BackupSistema.list('-data_hora', 1000);

    if (!todosBackups || todosBackups.length === 0) {
      return Response.json({
        sucesso: true,
        mensagem: 'Nenhum backup para limpar'
      });
    }

    // Agrupar por tipo de período
    const agora = new Date();
    const diarios = [];
    const semanais = [];
    const mensais = [];
    const deletar = [];

    for (const backup of todosBackups) {
      if (backup.status !== 'sucesso') continue; // Não contar backups falhados

      const dataBackup = new Date(backup.data_hora);
      const diasPassados = (agora - dataBackup) / (1000 * 60 * 60 * 24);

      // Últimos 7 backups diários
      if (diasPassados <= 7 && diarios.length < 7) {
        diarios.push(backup.id);
      }
      // Últimos 4 semanais
      else if (diasPassados > 7 && diasPassados <= 28 && semanais.length < 4) {
        semanais.push(backup.id);
      }
      // Últimos 3 mensais
      else if (diasPassados > 28 && diasPassados <= 90 && mensais.length < 3) {
        mensais.push(backup.id);
      }
      // Resto para deletar
      else {
        deletar.push(backup.id);
      }
    }

    // Garantir pelo menos 1 backup seguro
    const backup_ids_manter = [...diarios, ...semanais, ...mensais];
    if (backup_ids_manter.length === 0 && todosBackups.length > 0) {
      backup_ids_manter.push(todosBackups[0].id);
      deletar = deletar.filter(id => id !== todosBackups[0].id);
    }

    // Deletar backups antigos
    let totalDeletado = 0;
    for (const backupId of deletar) {
      try {
        await base44.asServiceRole.entities.BackupSistema.delete(backupId);
        totalDeletado++;
      } catch (e) {
        console.log(`Aviso ao deletar backup ${backupId}: ${e.message}`);
      }
    }

    return Response.json({
      sucesso: true,
      mensagem: `Política de retenção aplicada. ${totalDeletado} backups removidos.`,
      resumo: {
        diarios_mantidos: diarios.length,
        semanais_mantidos: semanais.length,
        mensais_mantidos: mensais.length,
        total_deletado: totalDeletado
      }
    });

  } catch (erro) {
    return Response.json({
      sucesso: false,
      erro: erro.message
    }, { status: 500 });
  }
});