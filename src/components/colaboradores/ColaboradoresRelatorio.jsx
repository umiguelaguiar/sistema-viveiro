import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const STATUS_LABELS = { presente: 'Presente', falta: 'Falta', atestado: 'Atestado', folga: 'Folga', afastado: 'Afastado' };
const ATIVIDADES = { tubete: 'Tubete', selecao: 'Seleção', irrigacao: 'Irrigação', expedicao: 'Expedição' };

export default function ColaboradoresRelatorio() {
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [ano, setAno] = useState(String(now.getFullYear()));

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => base44.entities.Colaborador.list() });
  const { data: frequencias = [] } = useQuery({ queryKey: ['frequencias'], queryFn: () => base44.entities.Frequencia.list('-data', 1000) });
  const { data: producoes = [] } = useQuery({ queryKey: ['producoes-colab'], queryFn: () => base44.entities.ProducaoColaborador.list('-data', 1000) });

  const prefix = `${ano}-${mes}`;
  const freqMes = frequencias.filter(f => f.data?.startsWith(prefix));
  const prodMes = producoes.filter(p => p.data?.startsWith(prefix));

  const meses = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const nomeMes = new Date(`${ano}-${mes}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const colabAtivos = colaboradores.filter(c => c.ativo !== false);

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Label>Mês:</Label>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Ano:</Label>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{['2024','2025','2026','2027'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <span className="text-sm font-medium capitalize text-muted-foreground">{nomeMes}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-3 py-2 font-medium">Colaborador</th>
              <th className="text-center px-3 py-2 font-medium text-green-700">Pres.</th>
              <th className="text-center px-3 py-2 font-medium text-destructive">Faltas</th>
              <th className="text-center px-3 py-2 font-medium text-amber-600">Ates.</th>
              <th className="text-center px-3 py-2 font-medium text-blue-600">Folgas</th>
              <th className="text-center px-3 py-2 font-medium">H. Extras</th>
              <th className="text-center px-3 py-2 font-medium">Produção</th>
            </tr>
          </thead>
          <tbody>
            {colabAtivos.map(c => {
              const cf = freqMes.filter(f => f.colaborador_id === c.id);
              const presentes = cf.filter(f => f.status === 'presente').length;
              const faltas = cf.filter(f => f.status === 'falta').length;
              const atestados = cf.filter(f => f.status === 'atestado').length;
              const folgas = cf.filter(f => f.status === 'folga').length;
              const hExtras = cf.reduce((s, f) => s + (f.horas_extras || 0), 0);
              const producao = prodMes.filter(p => p.colaborador_id === c.id).reduce((s, p) => s + (p.quantidade || 0), 0);
              return (
                <tr key={c.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-3 py-2 font-medium">{c.nome}<br/><span className="text-xs text-muted-foreground font-normal">{c.funcao}</span></td>
                  <td className="text-center px-3 py-2 text-green-700 font-medium">{presentes}</td>
                  <td className="text-center px-3 py-2 text-destructive font-medium">{faltas}</td>
                  <td className="text-center px-3 py-2 text-amber-600 font-medium">{atestados}</td>
                  <td className="text-center px-3 py-2 text-blue-600 font-medium">{folgas}</td>
                  <td className="text-center px-3 py-2">
                    {hExtras > 0 ? <Badge variant="outline" className="text-xs">+{hExtras.toFixed(1)}h</Badge> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="text-center px-3 py-2 font-medium">{producao > 0 ? producao.toLocaleString('pt-BR') : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {colabAtivos.length === 0 && <p className="text-sm text-muted-foreground p-4">Nenhum colaborador cadastrado.</p>}
      </div>
    </div>
  );
}