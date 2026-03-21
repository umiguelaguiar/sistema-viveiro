import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, TreePine, Loader2 } from 'lucide-react';

export default function SolicitarAcesso() {
  const [form, setForm] = useState({ nome: '', email: '', mensagem: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) { setError('E-mail é obrigatório.'); return; }
    setLoading(true);
    setError('');
    // Check if already requested
    const existing = await base44.entities.SolicitacaoAcesso.filter({ email: form.email });
    if (existing.length > 0) {
      setError('Já existe uma solicitação registrada para este e-mail.');
      setLoading(false);
      return;
    }
    await base44.entities.SolicitacaoAcesso.create({ ...form, status: 'pendente' });
    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <TreePine className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Viveiro Metalsider</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestão de Mudas</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-1">Solicitação enviada!</h2>
              <p className="text-sm text-muted-foreground">
                Sua solicitação foi registrada. Você receberá um convite por e-mail assim que for aprovada pelo administrador.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1">Solicitar acesso</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Preencha os dados abaixo para solicitar acesso ao sistema.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mensagem">Motivo / Mensagem <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Textarea
                    id="mensagem"
                    placeholder="Descreva brevemente por que precisa de acesso..."
                    rows={3}
                    value={form.mensagem}
                    onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Solicitar acesso'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}