import React from 'react';
import { Bot } from 'lucide-react';

export const SAUDACAO = 'Olá! Sou o Assistente IA do sistema. Posso ajudar você a consultar informações, analisar indicadores, comparar resultados e interpretar os dados registrados. O que deseja saber?';

const SUGESTOES = [
  'Qual foi a produção total deste mês?',
  'Compare a produção dos últimos três meses',
  'Qual é o estoque atual por clone?',
  'Como está a taxa de enraizamento por clone?',
  'Quanto foi expedido neste mês?',
  'Faça um resumo gerencial dos últimos 30 dias',
  'Qual a média de permanência das mudas na Casa de Vegetação?',
  'Quais foram as maiores perdas registradas?',
];

export default function AssistenteBoasVindas({ onSugestao }) {
  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed max-w-[88%]">
          {SAUDACAO}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sugestões de perguntas</p>
        <div className="flex flex-wrap gap-2">
          {SUGESTOES.map(s => (
            <button
              key={s}
              onClick={() => onSugestao(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted hover:border-primary/40 transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}