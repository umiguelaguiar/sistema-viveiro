import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseBool(v) {
  return v === 'true';
}

function parseNum(v) {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

function parseStr(v) {
  return v === '' ? undefined : v;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const csvUrl = 'https://media.base44.com/files/public/69bde243dc485779f5218ed4/505fcea08_Frequencia_export1.csv';
  const resp = await fetch(csvUrl);
  const text = await resp.text();
  const lines = text.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = fields[idx] ?? ''; });

    const rec = {
      colaborador_id: row.colaborador_id,
      data: row.data,
      status: row.status,
      e_plantao: parseBool(row.e_plantao),
      falta_compensada: parseBool(row.falta_compensada),
      banco_horas_utilizado: parseBool(row.banco_horas_utilizado),
      pagando_falta: parseBool(row.pagando_falta),
    };
    if (row.hora_entrada) rec.hora_entrada = row.hora_entrada;
    if (row.hora_saida) rec.hora_saida = row.hora_saida;
    if (row.tipo_hora_extra) rec.tipo_hora_extra = row.tipo_hora_extra;
    if (row.data_utilizacao_banco) rec.data_utilizacao_banco = row.data_utilizacao_banco;
    if (row.data_falta_paga) rec.data_falta_paga = row.data_falta_paga;
    if (row.observacao) rec.observacao = row.observacao;
    const ht = parseNum(row.horas_trabalhadas);
    if (ht !== undefined) rec.horas_trabalhadas = ht;
    const he = parseNum(row.horas_extras);
    if (he !== undefined) rec.horas_extras = he;

    records.push(rec);
  }

  const BATCH = 50;
  let total = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await base44.asServiceRole.entities.Frequencia.bulkCreate(batch);
    total += batch.length;
  }

  return Response.json({ inserted: total });
});