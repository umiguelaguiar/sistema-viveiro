import React from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine, GitBranch, Layers, ArrowRightLeft, Truck,
  Skull, Package, PackageCheck, Percent, TrendingUp, Download,
  ShieldAlert, UserCircle, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { canAccess, ROLES, getRoleLabel, getRoleBadgeColor } from '@/lib/roles';

const moreItems = [
  { label: 'Previsão', icon: TrendingUp, path: '/previsao' },
  { label: 'Porcentagem', icon: Percent, path: '/porcentagem' },
  { label: 'Transferência', icon: ArrowRightLeft, path: '/transferencia' },
  { label: 'Expedição', icon: Truck, path: '/expedicao' },
  { label: 'Perdas', icon: Skull, path: '/perdas' },
  { label: 'Espécies', icon: TreePine, path: '/especies' },
  { label: 'Clones', icon: GitBranch, path: '/clones' },
  { label: 'Lotes', icon: Layers, path: '/lotes' },
  { label: 'Insumos', icon: Package, path: '/insumos' },
  { label: 'Mov. Insumos', icon: PackageCheck, path: '/movimentacao-insumos' },
  { label: 'Backup', icon: Download, path: '/backup' },
];

export default function MoreMenuDrawer({ open, onClose }) {
  const { user } = useAuth();
  const role = user?.role || ROLES.USUARIO;

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!open) return null;

  const visibleItems = moreItems.filter(item => canAccess(role, item.path));

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 lg:hidden" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Mais opções</span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-0 p-2 max-h-[60vh] overflow-y-auto">
          {visibleItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors min-h-[72px] justify-center"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
            </Link>
          ))}

          {/* Admin link */}
          {role === ROLES.ADMIN && (
            <Link
              to="/admin"
              onClick={onClose}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[72px] justify-center"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-[10px] font-medium text-center leading-tight text-red-600 dark:text-red-400">Admin</span>
            </Link>
          )}
        </div>

        {/* Profile row */}
        <Link
          to="/perfil"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 border-t border-border hover:bg-muted transition-colors"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.email}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getRoleBadgeColor(role)}`}>
              {getRoleLabel(role)}
            </span>
          </div>
          <UserCircle className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>
    </>
  );
}