import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import { Camera, LogOut, User, Mail, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/shared/PageHeader';

export default function Perfil() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.full_name || '');

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar_url: file_url });
      toast({ title: 'Foto atualizada com sucesso!' });
      window.location.reload();
    } catch {
      toast({ title: 'Erro ao enviar foto', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ full_name: name });
      toast({ title: 'Nome atualizado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao salvar nome', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = user?.avatar_url;
  const initials = (user?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      <PageHeader title="Meu Perfil" description="Gerencie suas informações pessoais" />

      <div className="max-w-lg space-y-6">
        {/* Avatar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto de Perfil</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center text-2xl font-bold text-primary">
                  {initials}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>
            <div>
              <p className="font-semibold">{user?.full_name || 'Sem nome'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role)}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Nome completo</Label>
              <div className="flex gap-2">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
                <Button onClick={handleSaveName} disabled={saving} className="min-h-[44px]">
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label>E-mail</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                {user?.email}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Cargo</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                {getRoleLabel(user?.role)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button variant="destructive" onClick={() => logout()} className="w-full min-h-[44px]">
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}