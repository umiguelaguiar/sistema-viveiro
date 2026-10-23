import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Send, Loader2, Bot, AlertCircle } from 'lucide-react';
import AssistenteBoasVindas from '@/components/assistente/AssistenteBoasVindas';
import AssistenteMensagem from '@/components/assistente/AssistenteMensagem';
import AssistenteHistorico from '@/components/assistente/AssistenteHistorico';

export default function AssistenteIA() {
  const [conversas, setConversas] = useState([]);
  const [conversaAtual, setConversaAtual] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [entrada, setEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const fimRef = useRef(null);

  const carregarConversas = useCallback(async () => {
    const pagina = await base44.entities.AssistenteConversa.list({ sort: '-updated_date', limit: 40 });
    setConversas(Array.isArray(pagina) ? pagina : pagina?.items || []);
  }, []);

  useEffect(() => { carregarConversas(); }, [carregarConversas]);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [mensagens, enviando]);

  const novaConversa = () => {
    setConversaAtual(null);
    setMensagens([]);
    setErro('');
    setEntrada('');
    setHistoricoAberto(false);
  };

  const abrirConversa = (c) => {
    setConversaAtual(c);
    setMensagens(c.mensagens || []);
    setErro('');
    setHistoricoAberto(false);
  };

  const excluirConversa = async (c) => {
    await base44.entities.AssistenteConversa.delete(c.id);
    setConversas(prev => prev.filter(x => x.id !== c.id));
    if (conversaAtual?.id === c.id) novaConversa();
  };

  const enviar = async (texto) => {
    const pergunta = (typeof texto === 'string' ? texto : entrada).trim();
    if (!pergunta || enviando) return;

    setErro('');
    const comPergunta = [...mensagens, { papel: 'usuario', texto: pergunta, criado_em: new Date().toISOString() }];
    setMensagens(comPergunta);
    setEntrada('');
    setEnviando(true);

    try {
      const { data } = await base44.functions.invoke('assistenteIA', {
        pergunta,
        historico: comPergunta.slice(-6).map(m => ({ papel: m.papel, texto: m.texto })),
      });

      const resposta = {
        papel: 'assistente',
        texto: data?.resposta || 'Não foi possível gerar a análise desta consulta.',
        blocos: data?.blocos || [],
        fontes: data?.fontes || [],
        criado_em: new Date().toISOString(),
      };
      const completas = [...comPergunta, resposta];
      setMensagens(completas);

      if (conversaAtual) {
        await base44.entities.AssistenteConversa.update(conversaAtual.id, { mensagens: completas });
        setConversaAtual({ ...conversaAtual, mensagens: completas });
      } else {
        const criada = await base44.entities.AssistenteConversa.create({ titulo: pergunta.slice(0, 80), mensagens: completas });
        setConversaAtual(criada);
      }
      carregarConversas();
    } catch (e) {
      setErro(e?.response?.data?.error || e?.message || 'Não foi possível concluir a consulta.');
    } finally {
      setEnviando(false);
    }
  };

  const aoTeclar = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const painelHistorico = (
    <AssistenteHistorico
      conversas={conversas}
      conversaAtualId={conversaAtual?.id}
      onAbrir={abrirConversa}
      onExcluir={excluirConversa}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistente IA"
        description="Consultas, análises e indicadores em linguagem natural, a partir dos dados registrados no sistema"
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="lg:hidden gap-2" onClick={() => setHistoricoAberto(true)}>
              Conversas
            </Button>
            <Button className="gap-2" onClick={novaConversa}>
              <Plus className="w-4 h-4" /> Nova conversa
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <Card className="hidden lg:block p-4 h-fit">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Conversas</p>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={novaConversa}>
              <Plus className="w-3.5 h-3.5" /> Nova
            </Button>
          </div>
          <div className="max-h-[55vh] overflow-y-auto">{painelHistorico}</div>
        </Card>

        <Card className="flex flex-col h-[68vh] lg:h-[calc(100vh-290px)] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {mensagens.length === 0 && !enviando ? (
              <AssistenteBoasVindas onSugestao={enviar} />
            ) : (
              mensagens.map((m, i) => <AssistenteMensagem key={i} mensagem={m} />)
            )}

            {enviando && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="rounded-2xl bg-muted px-4 py-3 text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Consultando os dados do sistema...
                </div>
              </div>
            )}

            <div ref={fimRef} />
          </div>

          {erro && (
            <div className="flex items-start gap-2 border-t bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <div className="border-t p-3 space-y-2">
            <div className="flex items-end gap-2">
              <Textarea
                value={entrada}
                onChange={e => setEntrada(e.target.value)}
                onKeyDown={aoTeclar}
                placeholder="Escreva sua pergunta sobre produção, estoque, expedição, perdas, equipe..."
                rows={2}
                disabled={enviando}
                className="resize-none"
              />
              <Button onClick={() => enviar()} disabled={enviando || !entrada.trim()} className="gap-2 h-9">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O assistente somente consulta os dados do sistema: nenhum registro é criado, alterado ou excluído.
            </p>
          </div>
        </Card>
      </div>

      <Dialog open={historicoAberto} onOpenChange={setHistoricoAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Suas conversas</DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto">{painelHistorico}</div>
          <Button variant="outline" className="gap-2" onClick={novaConversa}>
            <Plus className="w-4 h-4" /> Nova conversa
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}