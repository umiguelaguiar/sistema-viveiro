import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TreePine,
  GitBranch,
  Layers,
  Factory,
  ArrowRightLeft,
  Truck,
  Skull,
  Package,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  Leaf,
  FileBarChart2,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Porcentagem', icon: Percent, path: '/porcentagem' },
  { label: 'Relatório', icon: FileBarChart2, path: '/relatorio' },
  { label: 'Espécies', icon: TreePine, path: '/especies' },
  { label: 'Clones', icon: GitBranch, path: '/clones' },
  { label: 'Lotes', icon: Layers, path: '/lotes' },
  { label: 'Produção', icon: Factory, path: '/producao' },
  { label: 'Transferência', icon: ArrowRightLeft, path: '/transferencia' },
  { label: 'Expedição', icon: Truck, path: '/expedicao' },
  { label: 'Perdas', icon: Skull, path: '/perdas' },
  { label: 'Insumos', icon: Package, path: '/insumos' },
  { label: 'Mov. Insumos', icon: PackageCheck, path: '/movimentacao-insumos' },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight truncate">ViveiroPro</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(item => {
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
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}