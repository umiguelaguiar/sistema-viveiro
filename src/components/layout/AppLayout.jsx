import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import BottomTabBar from './BottomTabBar';
import MoreMenuDrawer from './MoreMenuDrawer';
import { cn } from '@/lib/utils';
import { Sun, Moon } from 'lucide-react';

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return [theme, setTheme];
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const location = useLocation();

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Main content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        "lg:ml-60",
        collapsed && "lg:ml-16"
      )}>
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 border-b bg-card sticky top-0 z-20"
          style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: '56px' }}
        >
          <span className="font-bold text-base lg:hidden">Viveiro Metalsider</span>
          <div className="hidden lg:block" />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>

        <div
          className="p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto pb-24 lg:pb-8"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar onMoreClick={() => setMoreOpen(true)} />
      <MoreMenuDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}