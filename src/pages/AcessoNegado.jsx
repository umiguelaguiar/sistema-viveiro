import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine, LogOut, RefreshCw } from 'lucide-react';

export default function AcessoNegado() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    logout(true);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Refetch user data to check if role has been updated
      const currentUser = await base44.auth.me();
      if (currentUser.role && currentUser.role !== 'visitante') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <TreePine className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Viveiro Metalsider</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestão de Mudas</p>
        </div>

        {/* Main Card */}
        <Card className="shadow-md">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-3">
              <div className="text-2xl">⏳</div>
            </div>
            <CardTitle className="text-xl">Acesso Aguardando Aprovação</CardTitle>
            <CardDescription>
              Você está registrado como visitante
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Message */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed">
                Sua conta foi criada com sucesso, porém você não tem permissão para acessar o sistema no momento.
              </p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Um administrador precisará revisar e aprovar seu acesso. Você será notificado por e-mail assim que for aprovado.
              </p>
            </div>

            {/* User Info */}
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">E-mail registrado:</p>
              <p className="font-medium text-sm truncate">{user?.email || '—'}</p>
            </div>

            {/* Info Box */}
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">O que fazer agora?</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>Aguarde a aprovação do administrador</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Você receberá um e-mail de confirmação</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>Faça login novamente para acessar</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar Aprovação
                  </>
                )}
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex-1"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground text-center">
              Se tiver dúvidas, entre em contato com o administrador do sistema
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}