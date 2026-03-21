import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Factory,
  FileBarChart2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const primaryTabs = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Estoque', icon: Boxes, path: '/estoque' },
  { label: 'Produção', icon: Factory, path: '/producao' },
  { label: 'Relatório', icon: FileBarChart2, path: '/relatorio' },
  { label: 'Mais', icon: MoreHorizontal, path: '/mais' },
];

export default function BottomTabBar({ onMoreClick }) {
  const location = useLocation();

  const mainPaths = primaryTabs.slice(0, 4).map(t => t.path);
  const isMore = !mainPaths.includes(location.pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {primaryTabs.map((tab) => {
        const isActive = tab.path === '/mais'
          ? isMore
          : location.pathname === tab.path;

        return (
          <button
            key={tab.path}
            onClick={tab.path === '/mais' ? onMoreClick : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
            style={{ minHeight: '56px' }}
          >
            {tab.path === '/mais' ? (
              <>
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </>
            ) : (
              <Link to={tab.path} className="flex flex-col items-center gap-0.5 w-full">
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            )}
          </button>
        );
      })}
    </nav>
  );
}