import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getRoleLabel, getRoleBadgeColor, ROLES } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

function UserRow({ u, currentUserId }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState(u.role || ROLES.USUARIO);

  const updateMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Cargo atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar cargo'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário removido com sucesso!');
    },
    onError: () => toast.error('Erro ao remover usuário'),
  });

  const isSelf = u.id === currentUserId;
  const initials = (u.full_name || u.email || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      {u.avatar_url ? (
        <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{u.full_name || '—'}</p>
        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={role}
          onValueChange={setRole}
          disabled={isSelf}
        >
          <SelectTrigger className="w-36 min-h-[44px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROLES.VISITANTE}>Visitante</SelectItem>
            <SelectItem value={ROLES.USUARIO}>Usuário</SelectItem>
            <SelectItem value={ROLES.SUPERVISOR}>Supervisor</SelectItem>
            <SelectItem value={ROLES.GERENTE}>Gerente</SelectItem>
            <SelectItem value={ROLES.ADMIN}>Administrador</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={isSelf || updateMutation.isPending || role === (u.role || ROLES.USUARIO)}
          onClick={() => updateMutation.mutate({ id: u.id, role })}
          className="min-h-[44px]"
        >
          {updateMutation.isPending ? '...' : 'Salvar'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isSelf || deleteMutation.isPending}
          onClick={() => {
            if (confirm(`Tem certeza que deseja remover ${u.full_name || u.email}?`)) {
              deleteMutation.mutate(u.id);
            }
          }}
          className="min-h-[44px] text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          {deleteMutation.isPending ? '...' : <Trash2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}



export default function Admin() {
  const { user } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const roleCounts = users.reduce((acc, u) => {
    const r = u.role || ROLES.USUARIO;
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Administração"
        description="Gerencie os cargos e acessos dos usuários"
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">Área Restrita — Administrador</span>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { role: ROLES.VISITANTE, label: 'Visitantes' },
          { role: ROLES.USUARIO, label: 'Usuários' },
          { role: ROLES.SUPERVISOR, label: 'Supervisores' },
          { role: ROLES.GERENTE, label: 'Gerentes' },
          { role: ROLES.ADMIN, label: 'Administradores' },
        ].map(({ role, label }) => (
          <Card key={role} className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{roleCounts[role] || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Permissions reference */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Permissões por Cargo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { role: ROLES.VISITANTE, desc: 'Sem acesso. Aguardando aprovação do administrador' },
            { role: ROLES.USUARIO, desc: 'Dashboard, Estoque, Relatório, Porcentagem, Previsão, Insumos' },
            { role: ROLES.SUPERVISOR, desc: 'Todas as abas operacionais (exceto área administrativa)' },
            { role: ROLES.GERENTE, desc: 'Todas as abas operacionais (exceto área administrativa)' },
            { role: ROLES.ADMIN, desc: 'Acesso total, incluindo esta área administrativa' },
          ].map(({ role, desc }) => (
            <div key={role} className="flex items-start gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getRoleBadgeColor(role)}`}>
                {getRoleLabel(role)}
              </span>
              <span className="text-muted-foreground text-xs">{desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Users list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários cadastrados ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário encontrado</p>
          ) : (
            users.map(u => <UserRow key={u.id} u={u} currentUserId={user?.id} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}