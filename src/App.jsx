import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import { Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
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

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/porcentagem" element={<Porcentagem />} />
        <Route path="/relatorio" element={<Relatorio />} />
        <Route path="/especies" element={<Especies />} />
        <Route path="/clones" element={<Clones />} />
        <Route path="/lotes" element={<Lotes />} />
        <Route path="/producao" element={<Producao />} />
        <Route path="/transferencia" element={<Transferencia />} />
        <Route path="/expedicao" element={<Expedicao />} />
        <Route path="/perdas" element={<Perdas />} />
        <Route path="/insumos" element={<Insumos />} />
        <Route path="/movimentacao-insumos" element={<MovimentacaoInsumos />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/previsao" element={<Previsao />} />
        <Route path="/backup" element={<Backup />} />
      </Route>
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