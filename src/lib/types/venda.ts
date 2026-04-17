import type { Recibo, Pagamento } from './shared';

export interface Venda {
  id: string;
  numero_venda?: string;
  cliente_id: string;
  cliente_nome?: string;
  vendedor_id?: string;
  vendedor_nome?: string;
  destino_id?: string;
  destino_cidade?: string;
  destino_nome?: string;
  cidade_id?: string;
  cidade_nome?: string;
  produto_id?: string;
  produto_nome?: string;
  data_venda?: string;
  data_embarque?: string;
  data_final?: string;
  valor_total?: number;
  valor_total_bruto?: number;
  valor_taxas?: number;
  valor_liquido?: number;
  desconto_comercial?: number;
  status?: string;
  tipo?: string;
  cancelada?: boolean;
  conciliado?: boolean;
  company_id?: string;
  observacoes?: string;
  contrato_url?: string;
  contrato_path?: string;
  orcamento_id?: string;
  created_at?: string;
  updated_at?: string;
  recibos?: Recibo[];
  pagamentos?: Pagamento[];
}

export interface VendaListItem extends Venda {
  total_recibos?: number;
  total_pago?: number;
  saldo_devedor?: number;
}

export interface VendaDetalhe extends Venda {
  recibos: Recibo[];
  pagamentos: Pagamento[];
  historico?: VendaLog[];
}

export interface VendaLog {
  id: string;
  venda_id: string;
  acao: string;
  usuario_id?: string;
  usuario_nome?: string;
  dados_anteriores?: Record<string, unknown>;
  created_at: string;
}

export interface VendaFiltros {
  busca?: string;
  status?: string;
  tipo?: string;
  data_inicio?: string;
  data_fim?: string;
  vendedor_id?: string;
  company_id?: string;
  periodo?: 'todos' | 'mes_atual' | 'mes_anterior' | 'intervalo';
}

export interface VendaMergePayload {
  venda_origem_id: string;
  venda_destino_id: string;
}

export interface VendaCancelPayload {
  venda_id: string;
  motivo?: string;
}
