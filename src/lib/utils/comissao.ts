import type { Comissao, RegraComissao, TierComissao, StatusComissao } from '$lib/types/comissao';

/**
 * Calcula o valor da comissão baseado no valor comissionável e percentual
 */
export function calcularValorComissao(
  valorComissionavel: number,
  percentual: number
): number {
  if (valorComissionavel <= 0 || percentual <= 0) return 0;
  return parseFloat(((valorComissionavel * percentual) / 100).toFixed(2));
}

/**
 * Calcula o valor comissionável (valor da venda - valor não comissionado)
 */
export function calcularValorComissionavel(
  valorVenda: number,
  valorNaoComissionado: number = 0
): number {
  return Math.max(0, valorVenda - valorNaoComissionado);
}

/**
 * Determina o percentual a ser aplicado baseado na regra e performance
 * Para regras do tipo GERAL, retorna o percentual de meta atingida
 * Para regras ESCALONAVEIS, retorna baseado nas faixas (simplificado)
 */
export function determinarPercentualComissao(
  regra: RegraComissao,
  percentualMetaAtingida: number = 100
): number {
  if (!regra || !regra.ativo) return 0;

  if (regra.tipo === 'GERAL') {
    // Se atingiu a meta, usa meta_atingida
    // Se não atingiu, usa meta_nao_atingida
    // Se superou significativamente (>120%), usa super_meta
    if (percentualMetaAtingida >= 120) {
      return regra.super_meta || regra.meta_atingida || 0;
    } else if (percentualMetaAtingida >= 100) {
      return regra.meta_atingida || 0;
    } else {
      return regra.meta_nao_atingida || 0;
    }
  }

  // Para regras escalonáveis, busca o tier adequado
  if (regra.tipo === 'ESCALONAVEL' && regra.tiers && regra.tiers.length > 0) {
    // Encontra o tier que corresponde ao percentual de meta atingida
    const tier = regra.tiers.find(
      t => percentualMetaAtingida >= t.de_pct && percentualMetaAtingida <= t.ate_pct
    );
    
    if (tier) {
      // Calcula percentual base + incremento do tier
      const basePercentual = regra.meta_atingida || 0;
      return basePercentual + (tier.inc_pct_comissao || 0);
    }
  }

  return regra.meta_atingida || 0;
}

/**
 * Formata o status da comissão para exibição
 */
export function formatarStatusComissao(status: StatusComissao): string {
  const labels: Record<StatusComissao, string> = {
    PENDENTE: 'Pendente',
    PROCESSANDO: 'Processando',
    PAGA: 'Paga',
    CANCELADA: 'Cancelada'
  };
  return labels[status] || status;
}

/**
 * Retorna a classe CSS para o badge de status
 */
export function getStatusComissaoClass(status: StatusComissao): string {
  const classes: Record<StatusComissao, string> = {
    PENDENTE: 'bg-amber-100 text-amber-700',
    PROCESSANDO: 'bg-blue-100 text-blue-700',
    PAGA: 'bg-green-100 text-green-700',
    CANCELADA: 'bg-red-100 text-red-700'
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Valida se uma regra de comissão está válida para uso
 */
export function isRegraValida(regra: RegraComissao): boolean {
  if (!regra) return false;
  if (!regra.ativo) return false;
  
  // Verifica se tem pelo menos um percentual configurado
  const temPercentual = 
    (regra.meta_nao_atingida || 0) > 0 ||
    (regra.meta_atingida || 0) > 0 ||
    (regra.super_meta || 0) > 0;
  
  return temPercentual;
}

/**
 * Calcula resumo de comissões
 */
export function calcularResumoComissoes(comissoes: Comissao[]) {
  return comissoes.reduce(
    (acc, c) => {
      acc.total += c.valor_comissao;
      if (c.status === 'PENDENTE') acc.pendente += c.valor_comissao;
      if (c.status === 'PAGA') acc.pago += c.valor_comissao;
      if (c.status === 'CANCELADA') acc.cancelado += c.valor_comissao;
      return acc;
    },
    { total: 0, pendente: 0, pago: 0, cancelado: 0 }
  );
}

/**
 * Agrupa comissões por vendedor
 */
export function agruparComissoesPorVendedor(comissoes: Comissao[]) {
  return comissoes.reduce((acc, c) => {
    const key = c.vendedor_id;
    if (!acc[key]) {
      acc[key] = {
        vendedor_id: c.vendedor_id,
        vendedor_nome: c.vendedor || 'Desconhecido',
        comissoes: [],
        total: 0,
        pendente: 0,
        pago: 0
      };
    }
    acc[key].comissoes.push(c);
    acc[key].total += c.valor_comissao;
    if (c.status === 'PENDENTE') acc[key].pendente += c.valor_comissao;
    if (c.status === 'PAGA') acc[key].pago += c.valor_comissao;
    return acc;
  }, {} as Record<string, {
    vendedor_id: string;
    vendedor_nome: string;
    comissoes: Comissao[];
    total: number;
    pendente: number;
    pago: number;
  }>);
}

/**
 * Formata valor monetário
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

/**
 * Formata percentual
 */
export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(2)}%`;
}
