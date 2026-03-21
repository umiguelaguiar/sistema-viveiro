/**
 * Calcula o estoque atual por setor, clone e lote
 * baseado em produção, movimentações e perdas
 */

export function calculateStock(producoes, movimentacoes, perdas) {
  // stock[setorId][cloneId][loteId] = quantidade
  const stock = {};

  const ensureKeys = (setorId, cloneId, loteId) => {
    if (!stock[setorId]) stock[setorId] = {};
    if (!stock[setorId][cloneId]) stock[setorId][cloneId] = {};
    if (!stock[setorId][cloneId][loteId]) stock[setorId][cloneId][loteId] = 0;
  };

  // Produção adiciona estoque
  producoes.forEach(p => {
    ensureKeys(p.setor_id, p.clone_id, p.lote_id);
    stock[p.setor_id][p.clone_id][p.lote_id] += (p.quantidade || 0);
  });

  // Movimentações
  movimentacoes.forEach(m => {
    if (m.tipo === 'transferencia') {
      if (m.setor_origem_id) {
        ensureKeys(m.setor_origem_id, m.clone_id, m.lote_id);
        stock[m.setor_origem_id][m.clone_id][m.lote_id] -= (m.quantidade || 0);
      }
      if (m.setor_destino_id) {
        ensureKeys(m.setor_destino_id, m.clone_id, m.lote_id);
        stock[m.setor_destino_id][m.clone_id][m.lote_id] += (m.quantidade || 0);
      }
    } else if (m.tipo === 'expedicao') {
      if (m.setor_origem_id) {
        ensureKeys(m.setor_origem_id, m.clone_id, m.lote_id);
        stock[m.setor_origem_id][m.clone_id][m.lote_id] -= (m.quantidade || 0);
      }
    }
  });

  // Perdas reduzem estoque
  perdas.forEach(p => {
    ensureKeys(p.setor_id, p.clone_id, p.lote_id);
    stock[p.setor_id][p.clone_id][p.lote_id] -= (p.quantidade || 0);
  });

  return stock;
}

export function getStockBySetor(stock, setores) {
  return setores.map(setor => {
    let total = 0;
    const clones = stock[setor.id] || {};
    Object.values(clones).forEach(lotes => {
      Object.values(lotes).forEach(qty => { total += qty; });
    });
    return { setor, total: Math.max(0, total) };
  });
}

export function getStockByClone(stock, clones) {
  const result = {};
  clones.forEach(c => { result[c.id] = { clone: c, total: 0 }; });
  
  Object.values(stock).forEach(cloneMap => {
    Object.entries(cloneMap).forEach(([cloneId, lotes]) => {
      if (result[cloneId]) {
        Object.values(lotes).forEach(qty => { result[cloneId].total += qty; });
      }
    });
  });

  return Object.values(result).map(r => ({ ...r, total: Math.max(0, r.total) }));
}

export function getStockByLote(stock, lotes) {
  const result = {};
  lotes.forEach(l => { result[l.id] = { lote: l, total: 0 }; });

  Object.values(stock).forEach(cloneMap => {
    Object.values(cloneMap).forEach(loteMap => {
      Object.entries(loteMap).forEach(([loteId, qty]) => {
        if (result[loteId]) {
          result[loteId].total += qty;
        }
      });
    });
  });

  return Object.values(result).map(r => ({ ...r, total: Math.max(0, r.total) }));
}

export function getStockForSetorCloneLote(stock, setorId, cloneId, loteId) {
  return stock?.[setorId]?.[cloneId]?.[loteId] || 0;
}

export function getStockForSetorLote(stock, setorId, loteId) {
  let total = 0;
  const clones = stock[setorId] || {};
  Object.values(clones).forEach(lotes => {
    if (lotes[loteId]) total += lotes[loteId];
  });
  return total;
}

export function getTotalProducaoByClone(producoes, clones) {
  const result = {};
  clones.forEach(c => { result[c.id] = 0; });
  producoes.forEach(p => {
    if (result[p.clone_id] !== undefined) {
      result[p.clone_id] += (p.quantidade || 0);
    }
  });
  return result;
}

export function getTotalPerdasByClone(perdas, clones) {
  const result = {};
  clones.forEach(c => { result[c.id] = 0; });
  perdas.forEach(p => {
    if (result[p.clone_id] !== undefined) {
      result[p.clone_id] += (p.quantidade || 0);
    }
  });
  return result;
}

export function getMortalityRate(producaoTotal, perdasTotal) {
  if (!producaoTotal || producaoTotal === 0) return 0;
  return ((perdasTotal / producaoTotal) * 100);
}

// Determina de qual setor a expedição deve sair
// Prioridade: Rustificação > Sombreamento > Casa de Vegetação
export function getExpedicaoSetor(stock, setores, cloneId, loteId, quantidade) {
  const prioridade = ['Rustificação', 'Sombreamento', 'Casa de Vegetação'];
  
  for (const nomeSetor of prioridade) {
    const setor = setores.find(s => s.nome === nomeSetor);
    if (!setor) continue;
    const disponivel = getStockForSetorCloneLote(stock, setor.id, cloneId, loteId);
    if (disponivel >= quantidade) {
      return setor;
    }
  }
  return null;
}