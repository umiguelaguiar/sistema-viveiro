import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { TreePine, Clock, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AguardandoAprovacao() {
  const { user, logout } = useAuth();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header com logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <TreePine className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Viveiro Metalsider</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestão de Mudas</p>
        </div>

        {/* Card principal */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          {/* Ícone de relógio animado */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-900/20 flex items-center justify-center">
              <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400 animate-pulse" />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3 text-foreground">
              Acesso Pendente
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-2">
              Sua conta foi criada com sucesso!
            </p>
            <p className="text-muted-foreground text-base mb-8">
              Um administrador precisa aprovar seu acesso ao sistema. Aguarde a confirmação{dots}
            </p>

            {/* Info da conta */}
            <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-xl px-4 py-4 mb-8 border border-primary/10">
              <p className="text-sm text-muted-foreground mb-1">Conta de acesso:</p>
              <p className="font-semibold text-foreground text-base break-all">{user?.email}</p>
              {user?.full_name && (
                <p className="text-xs text-muted-foreground mt-1">{user?.full_name}</p>
              )}
            </div>

            {/* Dicas */}
            <div className="bg-muted/50 rounded-lg p-4 mb-8 text-left">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                💡 O que fazer?
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Você será notificado assim que for aprovado</li>
                <li>✓ Você pode voltar aqui para verificar o status</li>
                <li>✓ O administrador receberá sua solicitação em breve</li>
              </ul>
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full gap-2 border-primary/30 hover:bg-primary/5"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4" />
                Verificar Status
              </Button>
              <Button 
                variant="ghost" 
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Precisa de ajuda? Contate o administrador do sistema.
        </p>
      </div>
    </div>
  );
}