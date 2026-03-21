import React from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine, GitBranch, Layers, ArrowRightLeft, Truck,
  Skull, Package, PackageCheck, Percent, TrendingUp, Download, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  if (!open) return null;

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
          {moreItems.map(item => (
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
        </div>
      </div>
    </>
  );
}