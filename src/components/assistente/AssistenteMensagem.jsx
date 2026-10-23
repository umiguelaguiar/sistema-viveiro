import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import AssistenteBloco from './AssistenteBloco';

export default function AssistenteMensagem({ mensagem }) {
  const [copiado, setCopiado] = useState(false);
  const doUsuario = mensagem.papel === 'usuario';

  const copiar = async () => {
    await navigator.clipboard.writeText(mensagem.texto || '');
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className={cn('flex gap-3', doUsuario ? 'justify-end' : 'justify-start')}>
      {!doUsuario && (
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div className={cn('max-w-[88%] space-y-3', doUsuario && 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          doUsuario ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        )}>
          {doUsuario ? (
            <p className="whitespace-pre-wrap">{mensagem.texto}</p>
          ) : (
            <div className="space-y-2 [&_li]:my-0.5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
              <ReactMarkdown>{mensagem.texto || ''}</ReactMarkdown>
            </div>
          )}
        </div>

        {(mensagem.blocos || []).map((bloco, i) => (
          <div key={i} className="w-full">
            <AssistenteBloco bloco={bloco} />
          </div>
        ))}

        {!doUsuario && (mensagem.fontes || []).length > 0 && (
          <details className="w-full">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">Fonte dos dados</summary>
            <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              {mensagem.fontes.map((f, i) => <li key={i}>· {f}</li>)}
            </ul>
          </details>
        )}

        {!doUsuario && (
          <button onClick={copiar} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado' : 'Copiar resposta'}
          </button>
        )}
      </div>

      {doUsuario && (
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}