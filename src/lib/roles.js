// Role definitions and access control

export const ROLES = {
  USUARIO: 'usuario',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
};

// Routes accessible per role
export const ROLE_ROUTES = {
  [ROLES.USUARIO]: ['/', '/estoque', '/relatorio', '/porcentagem', '/previsao', '/insumos'],
  [ROLES.SUPERVISOR]: [
    '/', '/estoque', '/relatorio', '/porcentagem', '/previsao', '/insumos',
    '/producao', '/transferencia', '/expedicao', '/perdas', '/clones',
    '/lotes', '/especies', '/movimentacao-insumos', '/backup',
  ],
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
    [ROLES.USUARIO]: 'Usuário',
    [ROLES.SUPERVISOR]: 'Supervisor',
    [ROLES.ADMIN]: 'Administrador',
  };
  return labels[role] || role || 'Sem cargo';
}

export function getRoleBadgeColor(role) {
  const colors = {
    [ROLES.USUARIO]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    [ROLES.SUPERVISOR]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    [ROLES.ADMIN]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[role] || 'bg-muted text-muted-foreground';
}