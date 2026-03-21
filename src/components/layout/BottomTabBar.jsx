import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Boxes, Factory, FileBarChart2, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { canAccess, ROLES } from '@/lib/roles';

const primaryTabs = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Estoque', icon: Boxes, path: '/estoque' },
  { label: 'Produção', icon: Factory, path: '/producao' },
  { label: 'Relatório', icon: FileBarChart2, path: '/relatorio' },
];

export default function BottomTabBar({ onMoreClick }) {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role || ROLES.USUARIO;

  const visibleTabs = primaryTabs.filter(t => canAccess(role, t.path));
  const mainPaths = visibleTabs.map(t => t.path);
  const isMore = !mainPaths.includes(location.pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {visibleTabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
            style={{ minHeight: '56px' }}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}

      {/* More button */}
      <button
        onClick={onMoreClick}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
          isMore ? "text-primary" : "text-muted-foreground"
        )}
        style={{ minHeight: '56px' }}
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-[10px] font-medium">Mais</span>
      </button>
    </nav>
  );
}