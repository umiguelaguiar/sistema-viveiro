/**
 * Camada de consulta do Assistente IA — SOMENTE LEITURA.
 *
 * REGRA ABSOLUTA: este módulo apenas lê registros. Não existe create, update,
 * delete, importação ou alteração de esquema em nenhuma função daqui.
 *
 * Os cálculos replicam exatamente as regras já usadas pelas telas do sistema
 * (estoque, perdas/eficiência, enraizamento, permanência na casa de vegetação).
 */

export const ROLES_PERMITIDAS = ['admin', 'gerente', 'supervisor'];

const LIMITE_POR_PAGINA = 500;
const LIMITE_TOTAL_REGISTROS = 3000;
const MAX_DIAS_PERIODO = 800;
const FUSO = 'America/Sao_Paulo';

export const TIPOS_CONSULTA = [
  'catalogo', 'producao', 'movimentacoes', 'perdas', 'estoque', 'enraizamento',
  'comparativo', 'serie_mensal', 'tempo_casa_vegetacao', 'frequencia', 'insumos',
];

// ---------------------------------------------------------------- utilidades

function hojeISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO });
}

function somarDias(iso, dias) {
  const t = Date.parse(iso + 'T00:00:00Z') + dias * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function diferencaDias(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

function rotuloMes(mesISO) {
  if (!mesISO || mesISO.length < 7) return '(sem data)';
  return `${mesISO.slice(5, 7)}/${mesISO.slice(0, 4)}`;
}

function rotuloData(iso) {
  if (!ehData(iso)) return iso || '—';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function arredondar(v, casas = 2) {
  const f = Math.pow(10, casas);
  return Math.round((v + Number.EPSILON) * f) / f;
}

function n(v, casas = 1) {
  return (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function media(valores) {
  if (!valores.length) return 0;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

function tabela(titulo, colunas, linhas) {
  return { tipo: 'tabela', titulo, colunas, linhas };
}

function grafico(titulo, formato, chave, series, dados) {
  return { tipo: 'grafico', formato, titulo, chave, series, dados };
}

async function buscarTodos(entidade, filtro) {
  const itens = [];
  let cursor = null;
  while (itens.length < LIMITE_TOTAL_REGISTROS) {
    const opcoes = { limit: LIMITE_POR_PAGINA };
    if (cursor) opcoes.cursor = cursor;
    const pagina = await entidade.filter(filtro, opcoes);
    const lote = Array.isArray(pagina) ? pagina : (pagina && pagina.items ? pagina.items : []);
    itens.push(...lote);
    cursor = pagina && !Array.isArray(pagina) && pagina.next_cursor ? pagina.next_cursor : null;
    const temMais = pagina && !Array.isArray(pagina) && pagina.has_more ? true : false;
    if (!lote.length || !temMais || !cursor) break;
  }
  return itens.slice(0, LIMITE_TOTAL_REGISTROS);
}

function resolverPeriodo(p, opcoes = {}) {
  const avisos = [];
  let inicio = ehData(p.data_inicio) ? p.data_inicio : null;
  let fim = ehData(p.data_fim) ? p.data_fim : null;

  if (opcoes.padraoDias && !inicio && !fim) {
    fim = hojeISO();
    inicio = somarDias(fim, -opcoes.padraoDias);
    avisos.push(`Nenhum período foi informado, então considerei os últimos ${opcoes.padraoDias} dias (até ${rotuloData(fim)}).`);
  }
  if (inicio && fim && diferencaDias(inicio, fim) > MAX_DIAS_PERIODO) {
    return {
      erro: `O período pedido é amplo demais (${diferencaDias(inicio, fim)} dias). Peça um intervalo de até cerca de dois anos, ou divida a análise em partes (por exemplo, ano a ano).`,
    };
  }
  if (inicio && fim && diferencaDias(inicio, fim) < 0) {
    return { erro: 'A data final informada é anterior à data inicial. Reformule o período.' };
  }
  return { inicio, fim, avisos };
}

function filtroData(inicio, fim) {
  if (inicio && fim) return { data: { $gte: inicio, $lte: fim } };
  if (inicio) return { data: { $gte: inicio } };
  if (fim) return { data: { $lte: fim } };
  return {};
}

function resumoPeriodo(inicio, fim) {
  if (inicio && fim) return `${rotuloData(inicio)} a ${rotuloData(fim)}`;
  if (inicio) return `a partir de ${rotuloData(inicio)}`;
  if (fim) return `até ${rotuloData(fim)}`;
  return 'todo o histórico registrado';
}

function agruparSomar(itens, chaveFn) {
  const mapa = new Map();
  itens.forEach(i => {
    const k = chaveFn(i) || '(não informado)';
    mapa.set(k, (mapa.get(k) || 0) + (i.quantidade || 0));
  });
  return [...mapa.entries()]
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor);
}

// ------------------------------------------------------------- referências

export async function carregarReferencias(base44) {
  const [setores, clones, lotes, especies, colaboradores] = await Promise.all([
    base44.entities.Setor.list(),
    base44.entities.Clone.list(),
    base44.entities.Lote.list(),
    base44.entities.Especie.list(),
    base44.entities.Colaborador.list(),
  ]);
  return {
    setores, clones, lotes, especies, colaboradores,
    clonePorId: Object.fromEntries(clones.map(c => [c.id, c])),
    lotePorId: Object.fromEntries(lotes.map(l => [l.id, l])),
    setorPorId: Object.fromEntries(setores.map(s => [s.id, s])),
    colaboradorPorId: Object.fromEntries(colaboradores.map(c => [c.id, c])),
  };
}

const nomeClone = (id, refs) => refs.clonePorId[id]?.codigo_clone || '—';
const nomeLote = (id, refs) => refs.lotePorId[id]?.codigo || '—';
const nomeSetor = (id, refs) => refs.setorPorId[id]?.nome || '—';
const nomeColaborador = (id, refs) => refs.colaboradorPorId[id]?.nome || '(colaborador removido)';

function acharClone(codigo, refs) {
  if (!codigo) return null;
  return refs.clones.find(c => c.codigo_clone?.toLowerCase() === String(codigo).toLowerCase()) || null;
}

function acharLote(codigo, refs) {
  if (!codigo) return null;
  return refs.lotes.find(l => l.codigo?.toLowerCase() === String(codigo).toLowerCase()) || null;
}

function acharSetor(nome, refs) {
  if (!nome) return null;
  const alvo = String(nome).toLowerCase();
  return refs.setores.find(s => s.nome?.toLowerCase().includes(alvo)) || null;
}

function chaveDimensao(dimensao, item, refs) {
  switch (dimensao) {
    case 'mes': return item.data ? rotuloMes(item.data.slice(0, 7)) : null;
    case 'dia': return item.data ? rotuloData(item.data) : null;
    case 'clone': return nomeClone(item.clone_id, refs);
    case 'lote': return nomeLote(item.lote_id, refs);
    case 'setor_destino': return nomeSetor(item.setor_destino_id, refs);
    case 'setor_origem': return nomeSetor(item.setor_origem_id, refs);
    case 'setor': return nomeSetor(item.setor_id, refs);
    case 'motivo': return item.motivo || '(sem motivo)';
    default: return 'TOTAL';
  }
}

function ordenarRotulos(linhas, dimensao) {
  const temporal = ['mes', 'dia'].includes(dimensao);
  if (!temporal) return linhas.sort((a, b) => b.valor - a.valor);
  const chave = (r) => {
    if (dimensao === 'mes') return r.rotulo.slice(3, 7) + r.rotulo.slice(0, 2);
    const [d, m, a] = r.rotulo.split('/');
    return `${a}${m}${d}`;
  };
  return linhas.sort((a, b) => chave(a).localeCompare(chave(b)));
}

// ------------------------------------------------------------- consultas

async function consultaProducao(base44, p, refs) {
  const periodo = resolverPeriodo(p);
  if (periodo.erro) return { tipo: 'producao', erro: periodo.erro };
  const filtro = { ...filtroData(periodo.inicio, periodo.fim) };
  const clone = acharClone(p.clone_codigo, refs);
  const lote = acharLote(p.lote_codigo, refs);
  const setor = acharSetor(p.setor_nome, refs);
  if (clone) filtro.clone_id = clone.id;
  if (lote) filtro.lote_id = lote.id;
  if (setor) filtro.setor_id = setor.id;

  const registros = await buscarTodos(base44.entities.Producao, filtro);
  const total = registros.reduce((s, r) => s + (r.quantidade || 0), 0);
  const dimensao = p.agrupar_por || 'total';
  const filtros = [{ rotulo: 'Período', valor: resumoPeriodo(periodo.inicio, periodo.fim) }];
  if (clone) filtros.push({ rotulo: 'Clone', valor: clone.codigo_clone });
  if (lote) filtros.push({ rotulo: 'Lote', valor: lote.codigo });
  if (setor) filtros.push({ rotulo: 'Setor', valor: setor.nome });

  const resumo = [
    { rotulo: 'Produção total', valor: `${total.toLocaleString('pt-BR')} mudas` },
    { rotulo: 'Lançamentos', valor: registros.length },
    { rotulo: 'Clones envolvidos', valor: new Set(registros.map(r => r.clone_id)).size },
  ];
  if (!registros.length) {
    return { tipo: 'producao', titulo: 'Produção registrada', filtros, resumo, dados_para_ia: { total: 0, registros: 0 }, avisos: ['Nenhum lançamento de produção encontrado para os filtros informados.'] };
  }

  const linhas = ordenarRotulos(agruparSomar(registros, i => chaveDimensao(dimensao, i, refs)), dimensao);
  const series = [{ chave: 'valor', nome: 'Mudas' }];
  let apresentacao = null;
  if (dimensao !== 'total' && linhas.length > 1) {
    apresentacao = ['mes', 'dia'].includes(dimensao)
      ? grafico('Evolução da produção', 'linhas', 'rotulo', series, linhas)
      : grafico('Produção por ' + dimensao, 'barras', 'rotulo', series, linhas);
  }

  return {
    tipo: 'producao',
    titulo: 'Produção registrada',
    filtros,
    resumo,
    apresentacao,
    tabela: dimensao === 'total' ? [] : linhas.map(l => [l.rotulo, l.valor.toLocaleString('pt-BR')]),
    colunas_tabela: [dimensao === 'mes' ? 'Mês' : dimensao === 'dia' ? 'Dia' : 'Agrupamento', 'Mudas'],
    dados_para_ia: { total, registros: registros.length, agrupamento: dimensao, linhas: linhas.slice(0, 24), total_linhas: linhas.length },
    avisos: periodo.avisos,
  };
}

async function consultaMovimentacoes(base44, p, refs) {
  const periodo = resolverPeriodo(p);
  if (periodo.erro) return { tipo: 'movimentacoes', erro: periodo.erro };
  const tipoFiltro = ['transferencia', 'expedicao'].includes(p.tipo_movimentacao) ? p.tipo_movimentacao : null;
  const filtro = { ...filtroData(periodo.inicio, periodo.fim) };
  if (tipoFiltro) filtro.tipo = tipoFiltro;
  const clone = acharClone(p.clone_codigo, refs);
  const lote = acharLote(p.lote_codigo, refs);
  if (clone) filtro.clone_id = clone.id;
  if (lote) filtro.lote_id = lote.id;

  const registros = await buscarTodos(base44.entities.Movimentacao, filtro);
  const expedicoes = registros.filter(r => r.tipo === 'expedicao');
  const transferencias = registros.filter(r => r.tipo === 'transferencia');
  const totalExp = expedicoes.reduce((s, r) => s + (r.quantidade || 0), 0);
  const totalTransf = transferencias.reduce((s, r) => s + (r.quantidade || 0), 0);
  const dimensao = p.agrupar_por || 'mes';

  const filtros = [{ rotulo: 'Período', valor: resumoPeriodo(periodo.inicio, periodo.fim) }];
  if (clone) filtros.push({ rotulo: 'Clone', valor: clone.codigo_clone });
  if (lote) filtros.push({ rotulo: 'Lote', valor: lote.codigo });
  if (tipoFiltro) filtros.push({ rotulo: 'Tipo', valor: tipoFiltro === 'expedicao' ? 'Expedição' : 'Transferência' });

  const resumo = [
    { rotulo: 'Expedido', valor: `${totalExp.toLocaleString('pt-BR')} mudas` },
    { rotulo: 'Transferido', valor: `${totalTransf.toLocaleString('pt-BR')} mudas` },
    { rotulo: 'Expedições', valor: expedicoes.length },
  ];

  const base = tipoFiltro === 'expedicao' ? expedicoes : tipoFiltro === 'transferencia' ? transferencias : registros;
  const linhas = ordenarRotulos(agruparSomar(base, i => chaveDimensao(dimensao, i, refs)), dimensao);

  let apresentacao = null;
  if (linhas.length && dimensao !== 'total') {
    apresentacao = ['mes', 'dia'].includes(dimensao)
      ? grafico('Evolução das movimentações', 'linhas', 'rotulo', [{ chave: 'valor', nome: 'Mudas' }], linhas)
      : grafico('Movimentações por ' + dimensao, 'barras', 'rotulo', [{ chave: 'valor', nome: 'Mudas' }], linhas);
  }

  return {
    tipo: 'movimentacoes',
    titulo: 'Movimentações (transferências e expedições)',
    filtros, resumo, apresentacao,
    tabela: dimensao === 'total' ? [] : linhas.map(l => [l.rotulo, l.valor.toLocaleString('pt-BR')]),
    colunas_tabela: ['Agrupamento', 'Mudas'],
    dados_para_ia: {
      expedido: totalExp, transferido: totalTransf,
      expedicoes: expedicoes.length, transferencias: transferencias.length,
      agrupamento: dimensao, linhas: linhas.slice(0, 24),
    },
    avisos: periodo.avisos,
  };
}

async function consultaPerdas(base44, p, refs) {
  const periodo = resolverPeriodo(p);
  if (periodo.erro) return { tipo: 'perdas', erro: periodo.erro };
  const filtro = { ...filtroData(periodo.inicio, periodo.fim) };
  const clone = acharClone(p.clone_codigo, refs);
  if (clone) filtro.clone_id = clone.id;

  const [registros, producoes] = await Promise.all([
    buscarTodos(base44.entities.Perda, filtro),
    buscarTodos(base44.entities.Producao, filtroData(periodo.inicio, periodo.fim)),
  ]);

  const totalPerdas = registros.reduce((s, r) => s + (r.quantidade || 0), 0);
  const totalProducao = producoes.reduce((s, r) => s + (r.quantidade || 0), 0);
  const taxaPerda = totalProducao > 0 ? (totalPerdas / totalProducao) * 100 : 0;
  const eficiencia = totalProducao > 0 ? ((totalProducao - totalPerdas) / totalProducao) * 100 : 0;
  const dimensao = p.agrupar_por || 'motivo';

  const filtros = [{ rotulo: 'Período', valor: resumoPeriodo(periodo.inicio, periodo.fim) }];
  if (clone) filtros.push({ rotulo: 'Clone', valor: clone.codigo_clone });

  const resumo = [
    { rotulo: 'Mudas perdidas', valor: `${totalPerdas.toLocaleString('pt-BR')} mudas` },
    { rotulo: 'Taxa de perda', valor: `${n(taxaPerda, 1)}%` },
    { rotulo: 'Eficiência operacional', valor: `${n(eficiencia, 1)}%` },
  ];

  const linhas = ordenarRotulos(agruparSomar(registros, i => chaveDimensao(dimensao, i, refs)), dimensao);
  const avisos = [...(periodo.avisos || [])];
  if (taxaPerda > 8) avisos.push('Taxa de perda acima da meta do sistema (ideal abaixo de 8%).');
  else if (taxaPerda > 5) avisos.push('Taxa de perda em zona de atenção (ideal abaixo de 8%).');

  return {
    tipo: 'perdas',
    titulo: 'Perdas de mudas',
    filtros, resumo, avisos,
    apresentacao: dimensao === 'total' ? null : grafico('Perdas por ' + dimensao, 'barras', 'rotulo', [{ chave: 'valor', nome: 'Mudas perdidas' }], linhas),
    tabela: dimensao === 'total' ? [] : linhas.map(l => [l.rotulo, l.valor.toLocaleString('pt-BR')]),
    colunas_tabela: [dimensao === 'motivo' ? 'Motivo' : 'Agrupamento', 'Mudas perdidas'],
    dados_para_ia: {
      total_perdas: totalPerdas, total_producao_periodo: totalProducao,
      taxa_perda_percentual: arredondar(taxaPerda, 2), eficiencia_percentual: arredondar(eficiencia, 2),
      agrupamento: dimensao, linhas: linhas.slice(0, 24),
    },
  };
}

// Estoque atual — mesma fórmula de src/lib/stockCalculations.js
async function consultaEstoque(base44, p, refs) {
  const [producoes, movimentacoes, perdas] = await Promise.all([
    buscarTodos(base44.entities.Producao, {}),
    buscarTodos(base44.entities.Movimentacao, {}),
    buscarTodos(base44.entities.Perda, {}),
  ]);

  const estoque = {};
  const add = (setorId, cloneId, loteId, qtd) => {
    if (!setorId || !cloneId || !loteId) return;
    if (!estoque[setorId]) estoque[setorId] = {};
    if (!estoque[setorId][cloneId]) estoque[setorId][cloneId] = {};
    estoque[setorId][cloneId][loteId] = (estoque[setorId][cloneId][loteId] || 0) + qtd;
  };

  producoes.forEach(x => add(x.setor_id, x.clone_id, x.lote_id, x.quantidade || 0));
  movimentacoes.forEach(m => {
    if (m.tipo === 'transferencia') {
      add(m.setor_origem_id, m.clone_id, m.lote_id, -(m.quantidade || 0));
      add(m.setor_destino_id, m.clone_id, m.lote_id, m.quantidade || 0);
    } else if (m.tipo === 'expedicao') {
      add(m.setor_origem_id, m.clone_id, m.lote_id, -(m.quantidade || 0));
    }
  });
  perdas.forEach(x => add(x.setor_id, x.clone_id, x.lote_id, -(x.quantidade || 0)));

  const porSetor = {};
  const porClone = {};
  const porLote = {};
  Object.entries(estoque).forEach(([setorId, clones]) => {
    Object.entries(clones).forEach(([cloneId, lotes]) => {
      Object.entries(lotes).forEach(([loteId, qtd]) => {
        porSetor[setorId] = (porSetor[setorId] || 0) + qtd;
        porClone[cloneId] = (porClone[cloneId] || 0) + qtd;
        porLote[loteId] = (porLote[loteId] || 0) + qtd;
      });
    });
  });

  const dimensao = p.agrupar_por || 'setor';
  const mapa = dimensao === 'clone' ? porClone : dimensao === 'lote' ? porLote : porSetor;
  const rotular = (id) => dimensao === 'clone' ? nomeClone(id, refs) : dimensao === 'lote' ? nomeLote(id, refs) : nomeSetor(id, refs);
  const linhas = Object.entries(mapa)
    .map(([id, valor]) => ({ rotulo: rotular(id), valor: Math.max(0, valor) }))
    .filter(l => l.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const total = Object.values(porSetor).reduce((s, v) => s + Math.max(0, v), 0);
  const resumo = [
    { rotulo: 'Estoque total', valor: `${total.toLocaleString('pt-BR')} mudas` },
    ...linhas.slice(0, 6).map(l => ({ rotulo: l.rotulo, valor: `${l.valor.toLocaleString('pt-BR')} mudas` })),
  ];

  return {
    tipo: 'estoque',
    titulo: 'Estoque atual de mudas',
    filtros: [{ rotulo: 'Momento', valor: `posição em ${rotuloData(hojeISO())}` }],
    resumo,
    apresentacao: linhas.length ? grafico('Estoque por ' + dimensao, 'barras', 'rotulo', [{ chave: 'valor', nome: 'Mudas' }], linhas) : null,
    tabela: linhas.map(l => [l.rotulo, l.valor.toLocaleString('pt-BR'), total > 0 ? `${n((l.valor / total) * 100, 1)}%` : '—']),
    colunas_tabela: [dimensao === 'clone' ? 'Clone' : dimensao === 'lote' ? 'Lote' : 'Setor', 'Mudas', '% do total'],
    dados_para_ia: {
      estoque_total: total,
      por_setor: Object.fromEntries(Object.entries(porSetor).map(([id, v]) => [nomeSetor(id, refs), Math.max(0, v)])),
      agrupamento: dimensao, linhas: linhas.slice(0, 24),
    },
  };
}

// Enraizamento — mesma regra de src/pages/Indicadores.jsx
async function consultaEnraizamento(base44, p, refs) {
  const periodo = resolverPeriodo(p);
  if (periodo.erro) return { tipo: 'enraizamento', erro: periodo.erro };
  const filtroDataPeriodo = filtroData(periodo.inicio, periodo.fim);
  const [movimentacoes, perdas] = await Promise.all([
    buscarTodos(base44.entities.Movimentacao, { tipo: 'transferencia', ...filtroDataPeriodo }),
    buscarTodos(base44.entities.Perda, filtroDataPeriodo),
  ]);

  const clone = acharClone(p.clone_codigo, refs);
  const lote = acharLote(p.lote_codigo, refs);

  const alvo = movimentacoes.filter(m => {
    const origem = nomeSetor(m.setor_origem_id, refs).toLowerCase();
    const destino = nomeSetor(m.setor_destino_id, refs).toLowerCase();
    if (!origem.includes('sombra') || !destino.includes('rustif')) return false;
    if (clone && m.clone_id !== clone.id) return false;
    if (lote && m.lote_id !== lote.id) return false;
    return true;
  });

  const mapaPerdas = new Map();
  perdas.forEach(x => {
    if (!x.motivo || !x.motivo.includes('Descarte no enraizamento')) return;
    const k = `${x.lote_id}|${x.clone_id}|${x.setor_id}|${x.data}`;
    if (!mapaPerdas.has(k)) mapaPerdas.set(k, x.quantidade || 0);
  });

  const calculados = alvo.map(t => {
    const descartadas = mapaPerdas.get(`${t.lote_id}|${t.clone_id}|${t.setor_destino_id}|${t.data}`) || 0;
    const transferidas = t.quantidade || 0;
    const enraizadas = transferidas - descartadas;
    const taxa = transferidas > 0 ? arredondar((enraizadas / transferidas) * 100, 1) : 0;
    return { ...t, descartadas, transferidas, enraizadas, taxa };
  });

  const filtros = [{ rotulo: 'Período', valor: resumoPeriodo(periodo.inicio, periodo.fim) }];
  if (clone) filtros.push({ rotulo: 'Clone', valor: clone.codigo_clone });
  if (lote) filtros.push({ rotulo: 'Lote', valor: lote.codigo });

  const taxaMedia = arredondar(media(calculados.map(c => c.taxa)), 1);
  const status = taxaMedia >= 80 ? 'Ótimo' : taxaMedia >= 60 ? 'Médio' : 'Ruim';

  const porClone = new Map();
  calculados.forEach(c => {
    const k = c.clone_id || 'sem_clone';
    if (!porClone.has(k)) porClone.set(k, { nome: nomeClone(k, refs), transferidas: 0, descartadas: 0, enraizadas: 0, taxas: [] });
    const item = porClone.get(k);
    item.transferidas += c.transferidas;
    item.descartadas += c.descartadas;
    item.enraizadas += c.enraizadas;
    item.taxas.push(c.taxa);
  });
  const clonesResumo = [...porClone.values()].map(c => ({
    ...c,
    taxa_media: arredondar(media(c.taxas), 1),
    status: media(c.taxas) >= 80 ? 'Ótimo' : media(c.taxas) >= 60 ? 'Médio' : 'Ruim',
  })).sort((a, b) => b.transferidas - a.transferidas);

  // Evolução: média da taxa por data, por clone
  const porData = new Map();
  calculados.forEach(c => {
    if (!c.data) return;
    const nome = nomeClone(c.clone_id, refs);
    if (!porData.has(c.data)) porData.set(c.data, {});
    const ponto = porData.get(c.data);
    if (!ponto[nome]) ponto[nome] = [];
    ponto[nome].push(c.taxa);
  });
  const nomesClones = [...new Set(calculados.map(c => nomeClone(c.clone_id, refs)))].slice(0, 6);
  const dadosGrafico = [...porData.keys()].sort().map(data => {
    const ponto = { rotulo: rotuloData(data) };
    const valores = porData.get(data);
    nomesClones.forEach(nome => { if (valores[nome]) ponto[nome] = arredondar(media(valores[nome]), 1); });
    return ponto;
  });

  const resumo = [
    { rotulo: 'Taxa média de enraizamento', valor: `${n(taxaMedia, 1)}% (${status})` },
    { rotulo: 'Mudas transferidas', valor: `${calculados.reduce((s, c) => s + c.transferidas, 0).toLocaleString('pt-BR')}` },
    { rotulo: 'Descartadas no enraizamento', valor: `${calculados.reduce((s, c) => s + c.descartadas, 0).toLocaleString('pt-BR')}` },
    { rotulo: 'Transferências analisadas', valor: calculados.length },
  ];
  const avisos = [...(periodo.avisos || [])];
  if (taxaMedia > 0 && taxaMedia < 60) avisos.push('Enraizamento classificado como Ruim pela regra do sistema (abaixo de 60%).');

  return {
    tipo: 'enraizamento',
    titulo: 'Enraizamento (Casa de Sombra → Rustificação)',
    filtros, resumo, avisos,
    apresentacao: dadosGrafico.length > 1
      ? grafico('Evolução do enraizamento', 'linhas', 'rotulo', nomesClones.map(n => ({ chave: n, nome: n })), dadosGrafico)
      : null,
    tabela: clonesResumo.map(c => [c.nome, c.transferidas.toLocaleString('pt-BR'), c.descartadas.toLocaleString('pt-BR'), c.enraizadas.toLocaleString('pt-BR'), `${n(c.taxa_media, 1)}%`, c.status]),
    colunas_tabela: ['Clone', 'Transferidas', 'Descartadas', 'Enraizadas', '% Enraiz.', 'Status'],
    dados_para_ia: {
      taxa_media_percentual: taxaMedia, status, transferencias: calculados.length,
      por_clone: clonesResumo.map(c => ({ clone: c.nome, transferidas: c.transferidas, descartadas: c.descartadas, enraizadas: c.enraizadas, taxa_media: c.taxa_media, status: c.status })),
    },
  };
}

async function totalMetrica(base44, metrica, inicio, fim) {
  const filtro = filtroData(inicio, fim);
  if (metrica === 'producao') {
    const itens = await buscarTodos(base44.entities.Producao, filtro);
    return itens.reduce((s, r) => s + (r.quantidade || 0), 0);
  }
  if (metrica === 'expedicao') {
    const itens = await buscarTodos(base44.entities.Movimentacao, { tipo: 'expedicao', ...filtro });
    return itens.reduce((s, r) => s + (r.quantidade || 0), 0);
  }
  const itens = await buscarTodos(base44.entities.Perda, filtro);
  return itens.reduce((s, r) => s + (r.quantidade || 0), 0);
}

async function consultaComparativo(base44, p, refs) {
  const metrica = ['producao', 'expedicao', 'perdas'].includes(p.metrica) ? p.metrica : 'producao';
  const a = { inicio: ehData(p.periodo_principal_inicio) ? p.periodo_principal_inicio : null, fim: ehData(p.periodo_principal_fim) ? p.periodo_principal_fim : null };
  const b = { inicio: ehData(p.periodo_referencia_inicio) ? p.periodo_referencia_inicio : null, fim: ehData(p.periodo_referencia_fim) ? p.periodo_referencia_fim : null };
  if ((!a.inicio || !a.fim) && (!b.inicio || !b.fim)) {
    return { tipo: 'comparativo', erro: 'Para comparar preciso de dois períodos completos (início e fim de cada um). Informe também o ano, se for o caso.' };
  }
  const [valorA, valorB] = await Promise.all([
    totalMetrica(base44, metrica, a.inicio, a.fim),
    totalMetrica(base44, metrica, b.inicio, b.fim),
  ]);
  const variacao = valorB > 0 ? arredondar(((valorA - valorB) / valorB) * 100, 1) : null;
  const rotuloMetrica = metrica === 'producao' ? 'Produção' : metrica === 'expedicao' ? 'Expedição' : 'Perdas';
  const rotuloA = resumoPeriodo(a.inicio, a.fim);
  const rotuloB = resumoPeriodo(b.inicio, b.fim);

  const resumo = [
    { rotulo: `Analisado — ${rotuloA}`, valor: `${valorA.toLocaleString('pt-BR')} mudas` },
    { rotulo: `Referência — ${rotuloB}`, valor: `${valorB.toLocaleString('pt-BR')} mudas` },
    { rotulo: 'Variação (analisado vs referência)', valor: variacao === null ? 'Não calculável (período de referência sem registros)' : `${variacao > 0 ? '+' : ''}${n(variacao, 1)}% ${variacao > 0 ? '(aumento)' : variacao < 0 ? '(redução)' : '(estável)'}` },
  ];

  return {
    tipo: 'comparativo',
    titulo: `Comparativo de ${rotuloMetrica.toLowerCase()}`,
    filtros: [{ rotulo: 'Métrica', valor: rotuloMetrica }, { rotulo: 'Períodos', valor: `${rotuloA} × ${rotuloB}` }],
    resumo,
    apresentacao: grafico(`Comparativo de ${rotuloMetrica.toLowerCase()}`, 'barras', 'rotulo', [{ chave: 'valor', nome: 'Mudas' }], [
      { rotulo: `Analisado (${rotuloA})`, valor: valorA },
      { rotulo: `Referência (${rotuloB})`, valor: valorB },
    ]),
    tabela: [
      [rotuloA, valorA.toLocaleString('pt-BR')],
      [rotuloB, valorB.toLocaleString('pt-BR')],
      ['Diferença', (valorA - valorB).toLocaleString('pt-BR')],
      ['Variação (analisado vs referência)', variacao === null ? 'N/D' : `${variacao > 0 ? '+' : ''}${n(variacao, 1)}%`],
    ],
    colunas_tabela: ['Período', rotuloMetrica],
    dados_para_ia: { metrica: rotuloMetrica, periodo_a: rotuloA, valor_a: valorA, periodo_b: rotuloB, valor_b: valorB, diferenca: valorA - valorB, variacao_percentual: variacao },
  };
}

async function consultaSerieMensal(base44, p, refs) {
  const meses = Math.min(Math.max(Number(p.meses) || 6, 2), 24);
  const hoje = hojeISO();
  const primeiroDoMesAtual = `${hoje.slice(0, 7)}-01`;
  const mesAtras = (n) => {
    const [ano, mes] = primeiroDoMesAtual.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1 - n, 1)).toISOString().slice(0, 7);
  };
  const inicio = `${mesAtras(meses - 1)}-01`;
  const filtro = filtroData(inicio, hoje);

  const [producoes, expedicoes, perdas] = await Promise.all([
    buscarTodos(base44.entities.Producao, filtro),
    buscarTodos(base44.entities.Movimentacao, { tipo: 'expedicao', ...filtro }),
    buscarTodos(base44.entities.Perda, filtro),
  ]);

  const chaves = [];
  for (let i = meses - 1; i >= 0; i--) chaves.push(mesAtras(i));

  const bucket = (itens) => {
    const m = {};
    itens.forEach(r => { if (r.data) { const k = r.data.slice(0, 7); m[k] = (m[k] || 0) + (r.quantidade || 0); } });
    return m;
  };
  const bp = bucket(producoes);
  const be = bucket(expedicoes);
  const bd = bucket(perdas);

  const dados = chaves.map(m => ({
    rotulo: rotuloMes(m),
    producao: bp[m] || 0,
    expedicao: be[m] || 0,
    perdas: bd[m] || 0,
  }));

  const totalProd = dados.reduce((s, d) => s + d.producao, 0);
  const totalExp = dados.reduce((s, d) => s + d.expedicao, 0);
  const totalPerd = dados.reduce((s, d) => s + d.perdas, 0);

  return {
    tipo: 'serie_mensal',
    titulo: 'Evolução mensal',
    filtros: [{ rotulo: 'Período', valor: `${rotuloMes(chaves[0])} a ${rotuloMes(chaves[chaves.length - 1])} (${meses} meses)` }],
    resumo: [
      { rotulo: 'Produção no período', valor: `${totalProd.toLocaleString('pt-BR')} mudas` },
      { rotulo: 'Expedição no período', valor: `${totalExp.toLocaleString('pt-BR')} mudas` },
      { rotulo: 'Perdas no período', valor: `${totalPerd.toLocaleString('pt-BR')} mudas` },
    ],
    apresentacao: grafico('Evolução mensal', 'linhas', 'rotulo', [
      { chave: 'producao', nome: 'Produção' },
      { chave: 'expedicao', nome: 'Expedição' },
      { chave: 'perdas', nome: 'Perdas' },
    ], dados),
    tabela: dados.map(d => [d.rotulo, d.producao.toLocaleString('pt-BR'), d.expedicao.toLocaleString('pt-BR'), d.perdas.toLocaleString('pt-BR')]),
    colunas_tabela: ['Mês', 'Produção', 'Expedição', 'Perdas'],
    dados_para_ia: { meses, serie: dados, totais: { producao: totalProd, expedicao: totalExp, perdas: totalPerd } },
  };
}

// Permanência na casa de vegetação — mesma lógica da seção do Relatório
async function consultaTempoCasaVegetacao(base44, p, refs) {
  const cv = refs.setores.find(s => s.nome?.toLowerCase().includes('vegeta'));
  if (!cv) return { tipo: 'tempo_casa_vegetacao', erro: 'O setor "Casa de Vegetação" não foi encontrado no cadastro de setores.' };

  const [producoes, movimentacoes, perdas] = await Promise.all([
    buscarTodos(base44.entities.Producao, { setor_id: cv.id }),
    buscarTodos(base44.entities.Movimentacao, { setor_origem_id: cv.id }),
    buscarTodos(base44.entities.Perda, { setor_id: cv.id }),
  ]);

  const chaves = new Set();
  [...producoes, ...movimentacoes, ...perdas].forEach(r => {
    if (r.clone_id && r.lote_id) chaves.add(`${r.clone_id}|${r.lote_id}`);
  });

  const restantes = [];
  chaves.forEach(chave => {
    const [cloneId, loteId] = chave.split('|');
    const eventos = [
      ...producoes.filter(x => x.clone_id === cloneId && x.lote_id === loteId).map(x => ({ entrada: true, data: x.data, qtd: x.quantidade || 0 })),
      ...movimentacoes.filter(x => x.clone_id === cloneId && x.lote_id === loteId).map(x => ({ entrada: false, data: x.data, qtd: x.quantidade || 0 })),
      ...perdas.filter(x => x.clone_id === cloneId && x.lote_id === loteId).map(x => ({ entrada: false, data: x.data, qtd: x.quantidade || 0 })),
    ].sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));

    const fila = [];
    eventos.forEach(e => {
      if (e.entrada) {
        fila.push({ data: e.data, qtd: e.qtd });
      } else {
        let resta = e.qtd;
        while (resta > 0 && fila.length > 0) {
          const item = fila[0];
          const usa = Math.min(item.qtd, resta);
          item.qtd -= usa;
          resta -= usa;
          if (item.qtd <= 0) fila.shift();
        }
      }
    });

    fila.filter(f => f.qtd > 0 && f.data).forEach(f => {
      restantes.push({
        clone: nomeClone(cloneId, refs),
        lote: nomeLote(loteId, refs),
        data: f.data,
        qtd: f.qtd,
        dias: diferencaDias(f.data, hojeISO()),
      });
    });
  });

  if (!restantes.length) {
    return {
      tipo: 'tempo_casa_vegetacao',
      titulo: 'Permanência na Casa de Vegetação',
      filtros: [{ rotulo: 'Momento', valor: `posição em ${rotuloData(hojeISO())}` }],
      resumo: [{ rotulo: 'Mudas na Casa de Vegetação', valor: '0 mudas' }],
      avisos: ['Nenhuma muda está na Casa de Vegetação no momento.'],
      dados_para_ia: { total_mudas: 0 },
    };
  }

  const porSemana = new Map();
  restantes.forEach(r => {
    const d = new Date(r.data + 'T00:00:00Z');
    const dia = d.getUTCDay();
    const deslocamento = dia === 0 ? -6 : 1 - dia;
    const inicioSemana = somarDias(r.data, deslocamento);
    if (!porSemana.has(inicioSemana)) porSemana.set(inicioSemana, { mudas: 0, soma: 0, maisAntiga: r.dias, maisRecente: r.dias, lotes: new Set() });
    const s = porSemana.get(inicioSemana);
    s.mudas += r.qtd;
    s.soma += r.qtd * r.dias;
    s.maisAntiga = Math.max(s.maisAntiga, r.dias);
    s.maisRecente = Math.min(s.maisRecente, r.dias);
    s.lotes.add(`${r.lote}-${r.clone}`);
  });

  const semanas = [...porSemana.entries()].map(([inicio, s]) => ({
    inicio,
    rotulo: `${rotuloData(inicio).slice(0, 5)} a ${rotuloData(somarDias(inicio, 6)).slice(0, 5)}`,
    mudas: s.mudas,
    mediaDias: arredondar(s.soma / s.mudas, 1),
    maisAntiga: s.maisAntiga,
    maisRecente: s.maisRecente,
    lotes: s.lotes.size,
  })).sort((a, b) => a.inicio.localeCompare(b.inicio));

  const totalMudas = restantes.reduce((s, r) => s + r.qtd, 0);
  const mediaGeral = arredondar(restantes.reduce((s, r) => s + r.qtd * r.dias, 0) / totalMudas, 1);
  const maisAntiga = Math.max(...restantes.map(r => r.dias));

  return {
    tipo: 'tempo_casa_vegetacao',
    titulo: 'Permanência na Casa de Vegetação',
    filtros: [{ rotulo: 'Momento', valor: `posição em ${rotuloData(hojeISO())}` }],
    resumo: [
      { rotulo: 'Mudas no setor', valor: `${totalMudas.toLocaleString('pt-BR')} mudas` },
      { rotulo: 'Média de permanência', valor: `${n(mediaGeral, 1)} dias` },
      { rotulo: 'Permanência mais antiga', valor: `${maisAntiga} dias` },
    ],
    apresentacao: grafico('Média de dias por semana de entrada', 'barras', 'rotulo', [{ chave: 'mediaDias', nome: 'Média de dias' }], semanas),
    tabela: semanas.map(s => [s.rotulo, s.mudas.toLocaleString('pt-BR'), n(s.mediaDias, 1), `${s.maisRecente} a ${s.maisAntiga}`, s.lotes]),
    colunas_tabela: ['Semana de entrada', 'Mudas hoje', 'Média de dias', 'Faixa (dias)', 'Lotes'],
    dados_para_ia: {
      total_mudas_no_setor: totalMudas, media_geral_dias: mediaGeral, permanencia_mais_antiga_dias: maisAntiga,
      semanas: semanas.map(s => ({ semana: s.rotulo, mudas: s.mudas, media_dias: s.mediaDias, mais_antiga: s.maisAntiga })),
    },
  };
}

async function consultaFrequencia(base44, p, refs) {
  const periodo = resolverPeriodo(p, { padraoDias: 30 });
  if (periodo.erro) return { tipo: 'frequencia', erro: periodo.erro };
  const registros = await buscarTodos(base44.entities.Frequencia, filtroData(periodo.inicio, periodo.fim));

  const colaborador = p.colaborador_nome
    ? refs.colaboradores.find(c => c.nome?.toLowerCase().includes(String(p.colaborador_nome).toLowerCase()))
    : null;
  const base = colaborador ? registros.filter(r => r.colaborador_id === colaborador.id) : registros;

  const porColaborador = new Map();
  base.forEach(r => {
    const id = r.colaborador_id || 'sem_colaborador';
    if (!porColaborador.has(id)) porColaborador.set(id, { nome: nomeColaborador(id, refs), horas: 0, extras: 0, faltas: 0, atestados: 0, presencas: 0, registros: 0 });
    const c = porColaborador.get(id);
    c.horas += r.horas_trabalhadas || 0;
    c.extras += r.horas_extras || 0;
    c.registros += 1;
    if (r.status === 'falta') c.faltas += 1;
    else if (r.status === 'atestado') c.atestados += 1;
    else if (r.status === 'presente') c.presencas += 1;
  });

  const lista = [...porColaborador.values()].sort((a, b) => b.horas - a.horas);
  const resumo = [
    { rotulo: 'Horas trabalhadas', valor: `${n(lista.reduce((s, c) => s + c.horas, 0), 1)} h` },
    { rotulo: 'Horas extras', valor: `${n(lista.reduce((s, c) => s + c.extras, 0), 1)} h` },
    { rotulo: 'Faltas', valor: lista.reduce((s, c) => s + c.faltas, 0) },
    { rotulo: 'Colaboradores', valor: lista.length },
  ];

  return {
    tipo: 'frequencia',
    titulo: 'Frequência e horas da equipe',
    filtros: [{ rotulo: 'Período', valor: resumoPeriodo(periodo.inicio, periodo.fim) }, ...(colaborador ? [{ rotulo: 'Colaborador', valor: colaborador.nome }] : [])],
    resumo,
    avisos: periodo.avisos,
    apresentacao: lista.length > 1 ? grafico('Horas trabalhadas por colaborador', 'barras', 'rotulo', [{ chave: 'horas', nome: 'Horas trabalhadas' }], lista.slice(0, 12).map(c => ({ rotulo: c.nome, horas: arredondar(c.horas, 1) }))) : null,
    tabela: lista.slice(0, 30).map(c => [c.nome, n(c.horas, 1), n(c.extras, 1), c.faltas, c.atestados, c.presencas]),
    colunas_tabela: ['Colaborador', 'Horas trabalhadas', 'Horas extras', 'Faltas', 'Atestados', 'Presenças'],
    dados_para_ia: {
      registros: base.length, colaboradores: lista.length,
      total_horas: arredondar(lista.reduce((s, c) => s + c.horas, 0), 1),
      total_extras: arredondar(lista.reduce((s, c) => s + c.extras, 0), 1),
      total_faltas: lista.reduce((s, c) => s + c.faltas, 0),
      por_colaborador: lista.slice(0, 20).map(c => ({ nome: c.nome, horas: arredondar(c.horas, 1), extras: arredondar(c.extras, 1), faltas: c.faltas, atestados: c.atestados })),
    },
  };
}

async function consultaInsumos(base44, p, refs) {
  const periodo = resolverPeriodo(p);
  if (periodo.erro) return { tipo: 'insumos', erro: periodo.erro };
  const [insumos, movs] = await Promise.all([
    buscarTodos(base44.entities.Insumo, {}),
    buscarTodos(base44.entities.MovimentacaoInsumo, filtroData(periodo.inicio, periodo.fim)),
  ]);

  const porInsumo = new Map();
  movs.forEach(m => {
    const insumo = insumos.find(i => i.id === m.insumo_id);
    const nome = insumo ? `${insumo.nome} (${insumo.unidade})` : '(insumo removido)';
    if (!porInsumo.has(m.insumo_id)) porInsumo.set(m.insumo_id, { nome, entradas: 0, saidas: 0 });
    const item = porInsumo.get(m.insumo_id);
    if (m.tipo === 'entrada') item.entradas += m.quantidade || 0;
    else item.saidas += m.quantidade || 0;
  });

  const linhas = [...porInsumo.values()].map(i => ({ nome: i.nome, entradas: i.entradas, saidas: i.saidas, saldo: i.entradas - i.saidas }));
  const avisos = [...(periodo.avisos || [])];
  if (!movs.length) avisos.push('Não há movimentações de insumos registradas no período. Os insumos cadastrados existem, mas sem movimentação lançada.');

  return {
    tipo: 'insumos',
    titulo: 'Insumos',
    filtros: [{ rotulo: 'Período', valor: resumoPeriodo(periodo.inicio, periodo.fim) }],
    resumo: [
      { rotulo: 'Insumos cadastrados', valor: insumos.length },
      { rotulo: 'Movimentações no período', valor: movs.length },
    ],
    avisos,
    tabela: linhas.map(l => [l.nome, l.entradas.toLocaleString('pt-BR'), l.saidas.toLocaleString('pt-BR'), l.saldo.toLocaleString('pt-BR')]),
    colunas_tabela: ['Insumo', 'Entradas', 'Saídas', 'Saldo'],
    dados_para_ia: {
      insumos_cadastrados: insumos.map(i => ({ nome: i.nome, unidade: i.unidade })),
      movimentacoes_no_periodo: movs.length,
      por_insumo: linhas,
    },
  };
}

export async function consultaCatalogo(base44, refs) {
  const entidades = [
    ['Producao', 'Produção'], ['Movimentacao', 'Movimentações'], ['Perda', 'Perdas'],
    ['Lote', 'Lotes'], ['Clone', 'Clones'], ['Especie', 'Espécies'], ['Setor', 'Setores'],
    ['Insumo', 'Insumos'], ['MovimentacaoInsumo', 'Mov. de Insumos'],
    ['Colaborador', 'Colaboradores'], ['ProducaoColaborador', 'Produção por Colaborador'],
    ['Frequencia', 'Frequência'],
  ];
  const contagens = await Promise.all(entidades.map(async ([chave, rotulo]) => {
    try {
      const total = await base44.entities[chave].count();
      return { rotulo, total };
    } catch (e) {
      return { rotulo, total: null };
    }
  }));

  const [producoes, movimentacoes, perdas] = await Promise.all([
    buscarTodos(base44.entities.Producao, {}),
    buscarTodos(base44.entities.Movimentacao, {}),
    buscarTodos(base44.entities.Perda, {}),
  ]);
  const datas = [...producoes, ...movimentacoes, ...perdas].map(r => r.data).filter(ehData).sort();

  return {
    tipo: 'catalogo',
    titulo: 'Dados disponíveis no sistema',
    filtros: [{ rotulo: 'Cobertura', valor: datas.length ? `${rotuloData(datas[0])} a ${rotuloData(datas[datas.length - 1])}` : 'sem lançamentos' }],
    resumo: contagens.filter(c => c.total !== null).map(c => ({ rotulo: c.rotulo, valor: c.total })),
    apresentacao: tabela('Registros por entidade', ['Entidade', 'Registros'], contagens.map(c => [c.rotulo, c.total === null ? 'sem acesso' : c.total.toLocaleString('pt-BR')])),
    dados_para_ia: {
      entidades: contagens,
      periodo_coberto: datas.length ? { de: datas[0], ate: datas[datas.length - 1] } : null,
      setores: refs.setores.map(s => s.nome),
      clones: refs.clones.map(c => c.codigo_clone),
      lotes: refs.lotes.map(l => l.codigo),
    },
  };
}

// --------------------------------------------------------------- execução

export async function executarConsulta(base44, consulta, refs) {
  const p = consulta || {};
  switch (p.tipo) {
    case 'producao': return consultaProducao(base44, p, refs);
    case 'movimentacoes': return consultaMovimentacoes(base44, p, refs);
    case 'perdas': return consultaPerdas(base44, p, refs);
    case 'estoque': return consultaEstoque(base44, p, refs);
    case 'enraizamento': return consultaEnraizamento(base44, p, refs);
    case 'comparativo': return consultaComparativo(base44, p, refs);
    case 'serie_mensal': return consultaSerieMensal(base44, p, refs);
    case 'tempo_casa_vegetacao': return consultaTempoCasaVegetacao(base44, p, refs);
    case 'frequencia': return consultaFrequencia(base44, p, refs);
    case 'insumos': return consultaInsumos(base44, p, refs);
    case 'catalogo': return consultaCatalogo(base44, refs);
    default: return { tipo: p.tipo || 'desconhecida', erro: `Consulta "${p.tipo}" não existe no catálogo autorizado.` };
  }
}

export async function executarConsultas(base44, consultas, refs) {
  const lista = (Array.isArray(consultas) ? consultas : []).slice(0, 3).filter(c => c && TIPOS_CONSULTA.includes(c.tipo));
  if (!lista.length) return [];
  const resultados = [];
  for (const c of lista) {
    try {
      resultados.push(await executarConsulta(base44, c, refs));
    } catch (e) {
      resultados.push({ tipo: c.tipo, erro: `Falha ao consultar ${c.tipo}: ${e.message}` });
    }
  }
  return resultados;
}