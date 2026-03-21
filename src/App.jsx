import { Toaster } from "@/components/ui/toaster"
import { base44 } from '@/api/base44Client';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import RouteGuard from '@/components/layout/RouteGuard';
import Dashboard from '@/pages/Dashboard';
import Perfil from '@/pages/Perfil';
import Admin from '@/pages/Admin';
import Porcentagem from '@/pages/Porcentagem';
import Relatorio from '@/pages/Relatorio';
import Especies from '@/pages/Especies';
import Clones from '@/pages/Clones';
import Lotes from '@/pages/Lotes';
import Producao from '@/pages/Producao';
import Transferencia from '@/pages/Transferencia';
import Expedicao from '@/pages/Expedicao';
import Perdas from '@/pages/Perdas';
import Insumos from '@/pages/Insumos';
import MovimentacaoInsumos from '@/pages/MovimentacaoInsumos';
import Estoque from '@/pages/Estoque';
import Previsao from '@/pages/Previsao';
import Backup from '@/pages/Backup';
import SolicitarAcesso from '@/pages/SolicitarAcesso';
import AguardandoAprovacao from '@/pages/AguardandoAprovacao';

const AguardandoPendente = ({ user }) => {
  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['minha-solicitacao', user?.email],
    queryFn: () => base44.entities.SolicitacaoAcesso.filter({ email: user.email }),
    enabled: !!user?.email,
  });

  if (isLoading) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );

  return <AguardandoAprovacao solicitacaoExistente={solicitacoes.length > 0 ? solicitacoes[0] : null} />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Usuário logado mas sem role = aguardando aprovação
  if (isAuthenticated && user && !user.role) {
    return <AguardandoPendente user={user} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<RouteGuard><Dashboard /></RouteGuard>} />
        <Route path="/perfil" element={<RouteGuard><Perfil /></RouteGuard>} />
        <Route path="/admin" element={<RouteGuard><Admin /></RouteGuard>} />
        <Route path="/porcentagem" element={<RouteGuard><Porcentagem /></RouteGuard>} />
        <Route path="/relatorio" element={<RouteGuard><Relatorio /></RouteGuard>} />
        <Route path="/especies" element={<RouteGuard><Especies /></RouteGuard>} />
        <Route path="/clones" element={<RouteGuard><Clones /></RouteGuard>} />
        <Route path="/lotes" element={<RouteGuard><Lotes /></RouteGuard>} />
        <Route path="/producao" element={<RouteGuard><Producao /></RouteGuard>} />
        <Route path="/transferencia" element={<RouteGuard><Transferencia /></RouteGuard>} />
        <Route path="/expedicao" element={<RouteGuard><Expedicao /></RouteGuard>} />
        <Route path="/perdas" element={<RouteGuard><Perdas /></RouteGuard>} />
        <Route path="/insumos" element={<RouteGuard><Insumos /></RouteGuard>} />
        <Route path="/movimentacao-insumos" element={<RouteGuard><MovimentacaoInsumos /></RouteGuard>} />
        <Route path="/estoque" element={<RouteGuard><Estoque /></RouteGuard>} />
        <Route path="/previsao" element={<RouteGuard><Previsao /></RouteGuard>} />
        <Route path="/backup" element={<RouteGuard><Backup /></RouteGuard>} />
      </Route>
      <Route path="/solicitar-acesso" element={<SolicitarAcesso />} />
      <Route path="/Dashboard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App