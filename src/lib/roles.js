// Role definitions and access control

export const ROLES = {
  VISITANTE: 'visitante',
  USUARIO: 'usuario',
  SUPERVISOR: 'supervisor',
  GERENTE: 'gerente',
  ADMIN: 'admin',
};

const SUPERVISOR_ROUTES = [
  '/', '/estoque', '/relatorio', '/indicadores', '/previsao', '/insumos',
  '/producao', '/transferencia', '/expedicao', '/perdas', '/clones',
  '/lotes', '/especies', '/movimentacao-insumos', '/backup', '/colaboradores',
];

// Routes accessible per role
export const ROLE_ROUTES = {
  [ROLES.VISITANTE]: [],
  [ROLES.USUARIO]: ['/', '/estoque', '/relatorio', '/indicadores', '/previsao', '/insumos'],
  [ROLES.SUPERVISOR]: SUPERVISOR_ROUTES,
  [ROLES.GERENTE]: SUPERVISOR_ROUTES,
  [ROLES.ADMIN]: 'all', // all routes including /admin
};

export function canAccess(role, path) {
  if (!role) return false;
  const allowed = ROLE_ROUTES[role];
  if (allowed === 'all') return true;
  return allowed?.includes(path) ?? false;
}

export function getRoleLabel(role) {
  const labels = {
    [ROLES.VISITANTE]: 'Visitante',
    [ROLES.USUARIO]: 'Usuário',
    [ROLES.SUPERVISOR]: 'Supervisor',
    [ROLES.GERENTE]: 'Gerente',
    [ROLES.ADMIN]: 'Administrador',
  };
  return labels[role] || role || 'Sem cargo';
}

export function getRoleBadgeColor(role) {
  const colors = {
    [ROLES.VISITANTE]: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    [ROLES.USUARIO]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    [ROLES.SUPERVISOR]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    [ROLES.GERENTE]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    [ROLES.ADMIN]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[role] || 'bg-muted text-muted-foreground';
}