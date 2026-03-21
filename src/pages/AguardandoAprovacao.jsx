import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { TreePine, Clock, LogOut, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function AguardandoAprovacao({ solicitacaoExistente }) {
  const { user, logout } = useAuth();
  const [mensagem, setMensagem] = useState('');
  const [enviado, setEnviado] = useState(!!solicitacaoExistente);
  const [loading, setLoading] = useState(false);

  const handleEnviar = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.SolicitacaoAcesso.create({
      email: user.email,
      nome: user.full_name || '',
      mensagem,
      status: 'pendente',
    });
    setEnviado(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <TreePine className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Viveiro Metalsider</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestão de Mudas</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          {enviado ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Aguardando aprovação</h2>
              <p className="text-sm text-muted-foreground mb-1">
                Sua solicitação foi enviada para o administrador.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Você receberá acesso assim que for aprovado. Tente entrar novamente mais tarde.
              </p>
              <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground mb-6">
                Logado como: <span className="font-medium text-foreground">{user?.email}</span>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => logout()}>
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1">Solicitar acesso</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Você ainda não tem acesso ao sistema. Envie uma solicitação para o administrador.
              </p>
              <form onSubmit={handleEnviar} className="space-y-4">
                <div className="bg-muted rounded-lg px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Conta: </span>
                  <span className="font-medium">{user?.full_name || user?.email}</span>
                  {user?.full_name && <p className="text-xs text-muted-foreground">{user?.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mensagem">Motivo / Mensagem <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Textarea
                    id="mensagem"
                    placeholder="Descreva brevemente por que precisa de acesso..."
                    rows={3}
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Solicitar acesso'}
                </Button>
                <Button type="button" variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => logout()}>
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}