import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ColaboradoresDashboard from '@/components/colaboradores/ColaboradoresDashboard';
import ColaboradoresCadastro from '@/components/colaboradores/ColaboradoresCadastro';
import ColaboradoresFrequencia from '@/components/colaboradores/ColaboradoresFrequencia';
import ColaboradoresProducao from '@/components/colaboradores/ColaboradoresProducao';
import ColaboradoresRelatorio from '@/components/colaboradores/ColaboradoresRelatorio';

export default function Colaboradores() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Colaboradores</h1>
        <p className="text-sm text-muted-foreground mt-1">Controle de frequência, produção e relatórios</p>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="cadastro">Colaboradores</TabsTrigger>
          <TabsTrigger value="frequencia">Frequência</TabsTrigger>
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório Mensal</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><ColaboradoresDashboard /></TabsContent>
        <TabsContent value="cadastro"><ColaboradoresCadastro /></TabsContent>
        <TabsContent value="frequencia"><ColaboradoresFrequencia /></TabsContent>
        <TabsContent value="producao"><ColaboradoresProducao /></TabsContent>
        <TabsContent value="relatorio"><ColaboradoresRelatorio /></TabsContent>
      </Tabs>
    </div>
  );
}