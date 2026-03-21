import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar wrapper */}
      <div className={cn(
        "lg:hidden fixed left-0 top-0 h-screen z-40 transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar collapsed={false} setCollapsed={() => {}} />
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-[-44px] bg-sidebar text-sidebar-foreground p-2 rounded-r-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

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
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b bg-card sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-base">Viveiro Metalsider</span>
        </div>

        <div className="p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}