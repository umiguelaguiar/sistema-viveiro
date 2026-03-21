import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useEspecies() {
  return useQuery({
    queryKey: ['especies'],
    queryFn: () => base44.entities.Especie.list('-created_date'),
    initialData: [],
  });
}

export function useClones() {
  return useQuery({
    queryKey: ['clones'],
    queryFn: () => base44.entities.Clone.list('-created_date'),
    initialData: [],
  });
}

export function useLotes() {
  return useQuery({
    queryKey: ['lotes'],
    queryFn: () => base44.entities.Lote.list('-created_date'),
    initialData: [],
  });
}

export function useSetores() {
  return useQuery({
    queryKey: ['setores'],
    queryFn: () => base44.entities.Setor.list(),
    initialData: [],
  });
}

export function useProducoes() {
  return useQuery({
    queryKey: ['producoes'],
    queryFn: () => base44.entities.Producao.list('-data', 5000),
    initialData: [],
  });
}

export function useMovimentacoes() {
  return useQuery({
    queryKey: ['movimentacoes'],
    queryFn: () => base44.entities.Movimentacao.list('-data', 5000),
    initialData: [],
  });
}

export function usePerdas() {
  return useQuery({
    queryKey: ['perdas'],
    queryFn: () => base44.entities.Perda.list('-data', 5000),
    initialData: [],
  });
}

export function useInsumos() {
  return useQuery({
    queryKey: ['insumos'],
    queryFn: () => base44.entities.Insumo.list('-created_date'),
    initialData: [],
  });
}

export function useMovimentacoesInsumos() {
  return useQuery({
    queryKey: ['movimentacoes_insumos'],
    queryFn: () => base44.entities.MovimentacaoInsumo.list('-data', 500),
    initialData: [],
  });
}