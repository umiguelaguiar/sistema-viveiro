import React from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AssistenteHistorico({ conversas, conversaAtualId, onAbrir, onExcluir }) {
  if (!conversas.length) {
    return <p className="text-xs text-muted-foreground px-2 py-4">Suas conversas aparecerão aqui.</p>;
  }

  return (
    <div className="space-y-1">
      {conversas.map(c => (
        <div
          key={c.id}
          className={cn(
            'group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors',
            c.id === conversaAtualId ? 'bg-primary/10 text-foreground' : 'hover:bg-muted text-muted-foreground'
          )}
          onClick={() => onAbrir(c)}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-xs truncate">{c.titulo || 'Conversa'}</span>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
            title="Excluir conversa"
            onClick={(e) => { e.stopPropagation(); onExcluir(c); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}