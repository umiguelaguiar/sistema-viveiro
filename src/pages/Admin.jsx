import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getRoleLabel, getRoleBadgeColor, ROLES } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, ChevronDown, UserCheck, UserX, Clock, CheckCircle2, XCircle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useToast } from '@/components/ui/use-toast';

function UserRow({ u, currentUserId }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [role, setRole] = useState(u.role || ROLES.USUARIO);

  const updateMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Cargo atualizado!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar cargo', variant: 'destructive' }),
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
            <SelectItem value={ROLES.USUARIO}>Usuário</SelectItem>
            <SelectItem value={ROLES.SUPERVISOR}>Supervisor</SelectItem>
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
      </div>
    </div>
  );
}

function SolicitacoesSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-acesso'],
    queryFn: () => base44.entities.SolicitacaoAcesso.list('-created_date'),
  });

  const aprovarMutation = useMutation({
    mutationFn: async (s) => {
      // Convida o usuário com cargo "usuario"
      await base44.users.inviteUser(s.email, ROLES.USUARIO);
      // Marca como aprovado
      await base44.entities.SolicitacaoAcesso.update(s.id, { status: 'aprovado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-acesso'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Usuário aprovado e convidado com sucesso!' });
    },
    onError: (e) => toast({ title: 'Erro ao aprovar: ' + (e?.message || 'tente novamente'), variant: 'destructive' }),
  });

  const rejeitarMutation = useMutation({
    mutationFn: (s) => base44.entities.SolicitacaoAcesso.update(s.id, { status: 'rejeitado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-acesso'] });
      toast({ title: 'Solicitação rejeitada.' });
    },
  });

  const pendentes = solicitacoes.filter(s => s.status === 'pendente');
  const processadas = solicitacoes.filter(s => s.status !== 'pendente');

  const statusBadge = (status) => {
    if (status === 'aprovado') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Aprovado</Badge>;
    if (status === 'rejeitado') return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Rejeitado</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">Pendente</Badge>;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Solicitações de Acesso
          {pendentes.length > 0 && (
            <span className="ml-auto bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendentes.length} pendente{pendentes.length > 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
        ) : solicitacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma solicitação de acesso ainda.</p>
        ) : (
          <div className="space-y-1">
            {pendentes.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aguardando aprovação</p>
                {pendentes.map(s => (
                  <div key={s.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    <div className="w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.nome || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      {s.mensagem && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{s.mensagem}"</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="min-h-[40px] bg-green-600 hover:bg-green-700 text-white gap-1"
                        disabled={aprovarMutation.isPending || rejeitarMutation.isPending}
                        onClick={() => aprovarMutation.mutate(s)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[40px] text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1"
                        disabled={aprovarMutation.isPending || rejeitarMutation.isPending}
                        onClick={() => rejeitarMutation.mutate(s)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {processadas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico</p>
                {processadas.map(s => (
                  <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.nome || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </div>
                    {statusBadge(s.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { role: ROLES.USUARIO, label: 'Usuários' },
          { role: ROLES.SUPERVISOR, label: 'Supervisores' },
          { role: ROLES.ADMIN, label: 'Administradores' },
        ].map(({ role, label }) => (
          <Card key={role} className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{roleCounts[role] || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Solicitações de acesso */}
      <SolicitacoesSection />

      {/* Permissions reference */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Permissões por Cargo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { role: ROLES.USUARIO, desc: 'Dashboard, Estoque, Relatório, Porcentagem, Previsão, Insumos' },
            { role: ROLES.SUPERVISOR, desc: 'Todas as abas operacionais (exceto área administrativa)' },
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