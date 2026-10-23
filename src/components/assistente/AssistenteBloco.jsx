import React from 'react';
import BlocoResumo from './BlocoResumo';
import BlocoTabela from './BlocoTabela';
import BlocoGrafico from './BlocoGrafico';

export default function AssistenteBloco({ bloco }) {
  if (!bloco || !bloco.tipo) return null;
  if (bloco.tipo === 'resumo') return <BlocoResumo bloco={bloco} />;
  if (bloco.tipo === 'tabela') return <BlocoTabela bloco={bloco} />;
  if (bloco.tipo === 'grafico') return <BlocoGrafico bloco={bloco} />;
  return null;
}