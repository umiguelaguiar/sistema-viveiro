import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TreePine, GitBranch, Layers, Factory,
  ArrowRightLeft, Truck, Skull, Package, PackageCheck,
  ChevronLeft, ChevronRight, FileBarChart2, Percent, Boxes,
  TrendingUp, Download, ShieldAlert, UserCircle, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { canAccess, ROLES, getRoleLabel, getRoleBadgeColor } from '@/lib/roles';

const allNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Estoque', icon: Boxes, path: '/estoque' },
  { label: 'Porcentagem', icon: Percent, path: '/porcentagem' },
  { label: 'Relatório', icon: FileBarChart2, path: '/relatorio' },
  { label: 'Previsão', icon: TrendingUp, path: '/previsao' },
  { label: 'Espécies', icon: TreePine, path: '/especies' },
  { label: 'Clones', icon: GitBranch, path: '/clones' },
  { label: 'Lotes', icon: Layers, path: '/lotes' },
  { label: 'Produção', icon: Factory, path: '/producao' },
  { label: 'Transferência', icon: ArrowRightLeft, path: '/transferencia' },
  { label: 'Expedição', icon: Truck, path: '/expedicao' },
  { label: 'Perdas', icon: Skull, path: '/perdas' },
  { label: 'Insumos', icon: Package, path: '/insumos' },
  { label: 'Mov. Insumos', icon: PackageCheck, path: '/movimentacao-insumos' },
  { label: 'Backup', icon: Download, path: '/backup' },
  { divider: true },
  { label: 'Colaboradores', icon: Users, path: '/colaboradores' },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role || ROLES.USUARIO;

  const visibleItems = allNavItems.filter(item => canAccess(role, item.path));
  const initials = (user?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <img
          src="https://media.base44.com/images/public/69bde243dc485779f5218ed4/eceff1601_LogoViveiro.jpeg"
          alt="Logo"
          className="w-8 h-8 rounded-lg object-cover shrink-0"
        />
        {!collapsed && (
          <span className="font-bold text-base tracking-tight truncate">Viveiro Metalsider</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-sidebar-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Admin link */}
        {role === ROLES.ADMIN && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mt-2 border border-red-500/20",
              location.pathname === '/admin'
                ? "bg-red-500/20 text-red-400"
                : "text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
            )}
          >
            <ShieldAlert className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span className="truncate">Administração</span>}
          </Link>
        )}
      </nav>

      {/* User profile footer */}
      <Link
        to="/perfil"
        className="flex items-center gap-3 px-3 py-3 border-t border-sidebar-border hover:bg-sidebar-accent/50 transition-colors"
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary shrink-0">
            {initials}
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-sidebar-foreground">{user?.full_name || user?.email}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getRoleBadgeColor(role)}`}>
              {getRoleLabel(role)}
            </span>
          </div>
        )}
      </Link>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}