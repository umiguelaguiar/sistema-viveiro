import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Mapeamento de IDs antigos para nomes (extraído do padrão dos dados)
// Os IDs antigos aparecem na ordem do CSV de frequência
// Os colaboradores atuais foram recriados com os mesmos dados (nome, funcao, data_admissao)
// Portanto fazemos o cruzamento por nome

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 1. Buscar colaboradores atuais
    const colaboradoresAtuais = await base44.asServiceRole.entities.Colaborador.list();
    
    // 2. Buscar frequências atuais (com IDs antigos)
    const frequencias = await base44.asServiceRole.entities.Frequencia.list();
    
    // 3. Ler CSV de frequência da URL fornecida
    const csvUrl = 'https://media.base44.com/files/public/69bde243dc485779f5218ed4/6b95b0aa9_Frequencia_export.csv';
    const csvResp = await fetch(csvUrl);
    const csvText = await csvResp.text();
    
    const lines = csvText.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    // 4. Extrair IDs únicos antigos de colaboradores do CSV
    const oldIdSet = new Set();
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < headers.length) continue;
      const row = {};
      headers.forEach((h, idx) => { row[h] = cols[idx]?.replace(/"/g, '').trim() || ''; });
      oldIdSet.add(row['colaborador_id']);
    }
    
    const oldIds = Array.from(oldIdSet);
    
    // 5. Ler CSV de colaboradores (com IDs antigos) para fazer o mapeamento nome -> id_antigo
    const colabCsvUrl = 'https://media.base44.com/files/public/69bde243dc485779f5218ed4/41d705d31_Colaborador_export.csv';
    const colabCsvResp = await fetch(colabCsvUrl);
    const colabCsvText = await colabCsvResp.text();
    
    const colabLines = colabCsvText.split('\n').filter(l => l.trim());
    const colabHeaders = colabLines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    // Mapear: nome_normalizado -> id_novo (dos colaboradores atuais)
    const nomeParaIdNovo = {};
    for (const c of colaboradoresAtuais) {
      const nomeNorm = normalizarNome(c.nome);
      nomeParaIdNovo[nomeNorm] = c.id;
    }
    
    // Mapear: id_antigo -> nome (do CSV de colaboradores antigo)
    const idAntigoParaNome = {};
    for (let i = 1; i < colabLines.length; i++) {
      const cols = parseCSVLine(colabLines[i]);
      if (cols.length < colabHeaders.length) continue;
      const row = {};
      colabHeaders.forEach((h, idx) => { row[h] = cols[idx]?.replace(/"/g, '').trim() || ''; });
      idAntigoParaNome[row['id']] = row['nome'];
    }
    
    // 6. Construir mapeamento: id_antigo -> id_novo
    const mapeamento = {};
    const semMapeamento = [];
    
    for (const idAntigo of oldIds) {
      const nome = idAntigoParaNome[idAntigo];
      if (!nome) {
        semMapeamento.push({ idAntigo, motivo: 'ID não encontrado no CSV de colaboradores' });
        continue;
      }
      const nomeNorm = normalizarNome(nome);
      const idNovo = nomeParaIdNovo[nomeNorm];
      if (!idNovo) {
        semMapeamento.push({ idAntigo, nome, motivo: 'Colaborador não encontrado no sistema atual' });
        continue;
      }
      mapeamento[idAntigo] = { idNovo, nome };
    }
    
    // 7. Atualizar frequências existentes no banco com os novos IDs
    let atualizados = 0;
    let semColaborador = 0;
    
    for (const freq of frequencias) {
      const map = mapeamento[freq.colaborador_id];
      if (!map) {
        semColaborador++;
        continue;
      }
      if (freq.colaborador_id !== map.idNovo) {
        await base44.asServiceRole.entities.Frequencia.update(freq.id, {
          ...freq,
          colaborador_id: map.idNovo
        });
        atualizados++;
      }
    }
    
    return Response.json({
      sucesso: true,
      totalFrequencias: frequencias.length,
      atualizados,
      semColaborador,
      mapeamento,
      semMapeamento,
      oldIdsTotal: oldIds.length,
      colaboradoresAtuaisTotal: colaboradoresAtuais.length
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function normalizarNome(nome) {
  return nome?.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}