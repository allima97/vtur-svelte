// Tipos compartilhados entre módulos

export interface Recibo {
  id: string;
  venda_id?: string;
  produto_id?: string;
  produto_resolvido_id?: string;
  destino_cidade_id?: string | null;
  numero_recibo?: string | null;
  numero_recibo_normalizado?: string | null;
  numero_reserva?: string | null;
  tipo_pacote?: string | null;
  valor_total?: number | null;
  valor_taxas?: number | null;
  valor_du?: number | null;
  valor_rav?: number | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  data_venda?: string | null;
  contrato_path?: string | null;
  contrato_url?: string | null;
  is_baixa_rac?: boolean;
  created_at?: string;
  updated_at?: string;
  // Campos computados (joins)
  produto_nome?: string;
  tipo_produto_nome?: string;
  destino_cidade_nome?: string;
}

export interface Pagamento {
  id: string;
  venda_id?: string;
  forma_pagamento_id?: string | null;
  company_id?: string;
  forma_nome?: string | null;
  operacao?: string | null;
  plano?: string | null;
  valor_bruto?: number | null;
  desconto_valor?: number | null;
  valor_total?: number | null;
  parcelas?: any[] | null;
  parcelas_qtd?: number | null;
  parcelas_valor?: number | null;
  vencimento_primeira?: string | null;
  paga_comissao?: boolean | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Voucher {
  id: string;
  company_id?: string;
  provider?: string;
  nome?: string;
  codigo_systur?: string | null;
  codigo_fornecedor?: string | null;
  reserva_online?: string | null;
  passageiros?: string | null;
  tipo_acomodacao?: string | null;
  operador?: string | null;
  resumo?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  ativo?: boolean;
  extra_data?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface Passageiro {
  id: string;
  viagem_id?: string;
  cliente_id?: string;
  company_id?: string;
  papel?: 'passageiro' | 'responsavel';
  observacoes?: string | null;
  created_at?: string;
}

export type TipoPessoa = 'PF' | 'PJ';

export type StatusVenda = 'aberta' | 'fechada' | 'cancelada' | 'pendente';

export type StatusOrcamento = 'novo' | 'pendente' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado';

export type StatusViagem = 'planejada' | 'confirmada' | 'em_viagem' | 'concluida' | 'cancelada';
