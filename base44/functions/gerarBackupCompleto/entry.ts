import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ENTIDADES = [
  'Producao', 'Movimentacao', 'Perda', 'Clone', 'Lote',
  'Setor', 'Especie', 'Insumo', 'MovimentacaoInsumo',
  'Colaborador', 'Frequencia', 'ProducaoColaborador',
  'SolicitacaoAcesso', 'BackupSistema'
];

async function gerarHashSHA256(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function coletarDados(base44) {
  const dados = {};
  const entidadesInfo = [];

  for (const entidade of ENTIDADES) {
    try {
      const registros = await base44.asServiceRole.entities[entidade].list();
      dados[entidade] = registros || [];
      entidadesInfo.push({
        entidade,
        quantidade: registros?.length || 0
      });
    } catch (e) {
      console.log(`Aviso: Não foi possível ler ${entidade}: ${e.message}`);
      dados[entidade] = [];
      entidadesInfo.push({ entidade, quantidade: 0 });
    }
  }

  return { dados, entidadesInfo };
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

    const inicioExec = Date.now();

    try {
      // Coletar dados
      const { dados, entidadesInfo } = await coletarDados(base44);

      // Converter para JSON
      const jsonCompleto = JSON.stringify(dados, null, 2);
      const tamanhoMB = (new Blob([jsonCompleto]).size / 1024 / 1024).toFixed(2);

      // Gerar hash
      const hash = await gerarHashSHA256(jsonCompleto);

      // Gerar nome do arquivo
      const agora = new Date();
      const nomeArquivo = `backup_${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}_${String(agora.getHours()).padStart(2, '0')}-${String(agora.getMinutes()).padStart(2, '0')}.json`;

      // Calcular tempo de execução
      const tempoExecucao = ((Date.now() - inicioExec) / 1000).toFixed(2);

      // Total de registros
      const totalRegistros = entidadesInfo.reduce((s, e) => s + e.quantidade, 0);

      // Upload para storage (simulado - você implementaria com API real)
      const uploadStatus = ['local']; // Por padrão apenas local

      // Salvar registro no banco
      const registroBackup = {
        data_hora: new Date().toISOString(),
        tipo_backup: 'manual',
        usuario_responsavel: user.email,
        status: 'sucesso',
        tamanho_arquivo: parseFloat(tamanhoMB),
        nome_arquivo: nomeArquivo,
        local_armazenamento: uploadStatus,
        hash_integridade: hash,
        tempo_execucao: parseFloat(tempoExecucao),
        total_registros: totalRegistros,
        entidades_backup: entidadesInfo
      };

      await base44.asServiceRole.entities.BackupSistema.create(registroBackup);

      return Response.json({
        sucesso: true,
        mensagem: 'Backup gerado com sucesso',
        backup: registroBackup,
        dados: jsonCompleto // Retorna os dados para download
      });

    } catch (erro) {
      const tempoExecucao = ((Date.now() - inicioExec) / 1000).toFixed(2);

      // Registrar falha
      await base44.asServiceRole.entities.BackupSistema.create({
        data_hora: new Date().toISOString(),
        tipo_backup: 'manual',
        usuario_responsavel: user.email,
        status: 'erro',
        descricao_erro: erro.message,
        nome_arquivo: `backup_erro_${Date.now()}.json`,
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