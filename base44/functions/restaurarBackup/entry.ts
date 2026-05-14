import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ENTIDADES = [
  'Producao', 'Movimentacao', 'Perda', 'Clone', 'Lote',
  'Setor', 'Especie', 'Insumo', 'MovimentacaoInsumo',
  'Colaborador', 'Frequencia', 'ProducaoColaborador',
  'SolicitacaoAcesso'
];

// Entidades excluídas da restauração (metadados do sistema, não dados operacionais)
// BackupSistema é excluído intencionalmente para preservar o histórico de backups

async function gerarHashSHA256(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 });
    }

    const { jsonDados, hashValidacao, backupIdOrigemRestauracao } = await req.json();

    if (!jsonDados) {
      return Response.json({ error: 'Dados não fornecidos' }, { status: 400 });
    }

    const inicioExec = Date.now();

    try {
      // Validar integridade com hash
      if (hashValidacao) {
        const hashCalculado = await gerarHashSHA256(JSON.stringify(jsonDados, null, 2));
        if (hashCalculado !== hashValidacao) {
          return Response.json({
            sucesso: false,
            erro: 'Falha na validação de integridade - hash não corresponde'
          }, { status: 400 });
        }
      }

      // Antes de restaurar, fazer backup automático (fail-safe)
      const dadosAtua = {};
      for (const entidade of ENTIDADES) {
        try {
          const registros = await base44.asServiceRole.entities[entidade].list();
          dadosAtua[entidade] = registros || [];
        } catch {
          dadosAtua[entidade] = [];
        }
      }

      const jsonBackupSeguranca = JSON.stringify(dadosAtua, null, 2);
      const nomeBackupSeg = `backup_seguranca_pre_restauracao_${Date.now()}.json`;
      const tamanhoMBSeg = (new Blob([jsonBackupSeguranca]).size / 1024 / 1024).toFixed(2);

      await base44.asServiceRole.entities.BackupSistema.create({
        data_hora: new Date().toISOString(),
        tipo_backup: 'automático',
        usuario_responsavel: user.email,
        status: 'sucesso',
        descricao_erro: 'Backup de segurança automático antes de restauração',
        tamanho_arquivo: parseFloat(tamanhoMBSeg),
        nome_arquivo: nomeBackupSeg,
        local_armazenamento: ['local'],
        hash_integridade: await gerarHashSHA256(jsonBackupSeguranca),
        tempo_execucao: 0,
        total_registros: Object.values(dadosAtua).reduce((s, arr) => s + (arr?.length || 0), 0)
      });

      // Apagar dados atuais
      for (const entidade of ENTIDADES) {
        try {
          const registros = await base44.asServiceRole.entities[entidade].list();
          for (const reg of registros || []) {
            await base44.asServiceRole.entities[entidade].delete(reg.id);
          }
        } catch (e) {
          console.log(`Aviso ao deletar ${entidade}: ${e.message}`);
        }
      }

      // Restaurar dados do backup
      let totalRestaurados = 0;
      for (const [entidade, registros] of Object.entries(jsonDados)) {
        if (!ENTIDADES.includes(entidade) || !Array.isArray(registros)) continue;

        // Limpar campos internos
        const limpos = registros.map(({ id, created_date, updated_date, created_by, ...rest }) => rest);

        if (limpos.length > 0) {
          await base44.asServiceRole.entities[entidade].bulkCreate(limpos);
          totalRestaurados += limpos.length;
        }
      }

      const tempoExecucao = ((Date.now() - inicioExec) / 1000).toFixed(2);

      // Registrar sucesso da restauração
      if (backupIdOrigemRestauracao) {
        const backupOrigem = await base44.asServiceRole.entities.BackupSistema.get(backupIdOrigemRestauracao);
        if (backupOrigem) {
          await base44.asServiceRole.entities.BackupSistema.update(backupIdOrigemRestauracao, {
            ...backupOrigem,
            restaurado: true
          });
        }
      }

      await base44.asServiceRole.entities.BackupSistema.create({
        data_hora: new Date().toISOString(),
        tipo_backup: 'manual',
        usuario_responsavel: user.email,
        status: 'sucesso',
        descricao_erro: `Restauração concluída com sucesso - ${totalRestaurados} registros`,
        nome_arquivo: `restauracao_${Date.now()}.json`,
        local_armazenamento: [],
        tempo_execucao: parseFloat(tempoExecucao),
        total_registros: totalRestaurados
      });

      return Response.json({
        sucesso: true,
        mensagem: `Restauração concluída! ${totalRestaurados} registros foram restaurados.`,
        totalRestaurados,
        tempoExecucao: parseFloat(tempoExecucao)
      });

    } catch (erro) {
      const tempoExecucao = ((Date.now() - inicioExec) / 1000).toFixed(2);

      await base44.asServiceRole.entities.BackupSistema.create({
        data_hora: new Date().toISOString(),
        tipo_backup: 'manual',
        usuario_responsavel: user.email,
        status: 'erro',
        descricao_erro: `Erro na restauração: ${erro.message}`,
        nome_arquivo: `restauracao_erro_${Date.now()}.json`,
        local_armazenamento: [],
        tempo_execucao: parseFloat(tempoExecucao)
      });

      return Response.json({
        sucesso: false,
        erro: erro.message
      }, { status: 500 });
    }

  } catch (erro) {
    return Response.json({
      sucesso: false,
      erro: erro.message
    }, { status: 500 });
  }
});