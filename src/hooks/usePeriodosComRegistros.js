import { useMemo } from 'react';
import { getPeriodos, dataEstaNoPeriodo } from '@/lib/periodoColaboradores';

/**
 * Retorna apenas os períodos que possuem ao menos um registro,
 * mais o período corrente (sempre visível para novos lançamentos).
 *
 * @param {Array} registros - Array de objetos com campo `data`
 * @param {number} qtd - Quantidade máxima de períodos a gerar (default 24)
 * @returns {{ periodos, periodoCorrente }}
 */
export function usePeriodosComRegistros(registros = [], qtd = 24) {
  return useMemo(() => {
    const todos = getPeriodos(qtd);
    // índice 0 = próximo mês futuro, índice 1 = período corrente
    const periodoCorrente = todos[1] || todos[0];

    const periodosFiltrados = todos.filter(p => {
      // Sempre mostrar o próximo (futuro) e o corrente
      if (p.key === todos[0]?.key || p.key === periodoCorrente?.key) return true;
      // Mostrar apenas se houver ao menos um registro neste período
      return registros.some(r => r.data && dataEstaNoPeriodo(r.data, p.key));
    });

    return { periodos: periodosFiltrados, periodoCorrente };
  }, [registros, qtd]);
}