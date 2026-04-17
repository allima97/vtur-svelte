// Tipos do Módulo de Comissões

export type TipoRegraComissao = 'GERAL' | 'ESCALONAVEL';
export type StatusComissao = 'PENDENTE' | 'PROCESSANDO' | 'PAGA' | 'CANCELADA';
export type FaixaTier = 'PRE' | 'POS';

// Regra de Comissão
export interface RegraComissao {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoRegraComissao;
  meta_nao_atingida: number;
  meta_atingida: number;
  super_meta: number;
  ativo: boolean;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  tiers: TierComissao[];
  vendedores_count?: number;
}

// Tier/Faixa de comissão escalonável
export interface TierComissao {
  id?: string;
  regra_id?: string;
  faixa: FaixaTier;
  ordem: number;
  de_pct: number;
  ate_pct: number;
  inc_pct_meta: number;
  inc_pct_comissao: number;
  created_at?: string;
  updated_at?: string;
}

// Associação de vendedor a regra
export interface VendedorRegraComissao {
  id: string;
  vendedor_id: string;
  vendedor_nome?: string;
  regra_id: string;
  regra_nome?: string;
  regra_tipo?: TipoRegraComissao;
  percentual_base?: number;
  data_inicio: string;
  data_fim: string | null;
  prioridade: number;
  ativo: boolean;
  vigente: boolean;
  created_at: string;
  updated_at: string;
}

// Comissão calculada/paga
export interface Comissao {
  id: string;
  venda_id: string;
  numero_venda?: string;
  vendedor_id: string;
  vendedor?: string;
  cliente?: string;
  cliente_id?: string;
  data_venda?: string;
  regra_id: string | null;
  regra_nome?: string;
  valor_venda: number;
  valor_comissionavel: number;
  percentual_aplicado: number;
  valor_comissao: number;
  status: StatusComissao;
  data_pagamento?: string;
  observacoes_pagamento?: string;
  pago_por?: string;
  mes_referencia: number;
  ano_referencia: number;
  company_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// DTO para criar regra
export interface CreateRegraComissaoDTO {
  nome: string;
  descricao?: string;
  tipo: TipoRegraComissao;
  meta_nao_atingida?: number;
  meta_atingida?: number;
  super_meta?: number;
  ativo?: boolean;
  company_id?: string;
  tiers?: Omit<TierComissao, 'id' | 'regra_id' | 'created_at' | 'updated_at'>[];
}

// DTO para atualizar regra
export interface UpdateRegraComissaoDTO {
  nome?: string;
  descricao?: string;
  tipo?: TipoRegraComissao;
  meta_nao_atingida?: number;
  meta_atingida?: number;
  super_meta?: number;
  ativo?: boolean;
  tiers?: Omit<TierComissao, 'id' | 'regra_id' | 'created_at' | 'updated_at'>[];
}

// DTO para associar vendedor a regra
export interface CreateVendedorRegraDTO {
  vendedor_id: string;
  regra_id: string;
  data_inicio?: string;
  data_fim?: string | null;
  prioridade?: number;
  ativo?: boolean;
}

// DTO para calcular comissões
export interface CalcularComissoesDTO {
  venda_ids?: string[];
  vendedor_ids?: string[];
  data_inicio?: string;
  data_fim?: string;
  mes_referencia?: number;
  ano_referencia?: number;
}

// Resultado do cálculo
export interface ResultadoCalculoComissoes {
  success: boolean;
  message: string;
  processadas: number;
  erro: number;
  total_vendas: number;
  detalhes: DetalheCalculoComissao[];
}

// Detalhe de item calculado
export interface DetalheCalculoComissao {
  venda_id: string;
  numero_venda: string;
  cliente: string;
  valor_venda: number;
  valor_comissionavel: number;
  percentual: number;
  valor_comissao: number;
  regra: string;
  status: 'calculada' | 'ignorada' | 'erro';
  motivo?: string;
}

// DTO para pagamento
export interface PagamentoComissaoDTO {
  comissao_ids: string[];
  data_pagamento: string;
  observacoes?: string;
}

// Resumo de comissões
export interface ResumoComissoes {
  total_pendente: number;
  total_pago: number;
  total_geral: number;
}

// Resumo por vendedor
export interface ResumoVendedorComissao {
  vendedor_id: string;
  vendedor_nome: string;
  total_vendas: number;
  total_comissao: number;
  total_pago: number;
  total_pendente: number;
}
