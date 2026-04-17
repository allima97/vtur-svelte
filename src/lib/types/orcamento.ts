import type { StatusOrcamento } from './shared';

export interface OrcamentoItem {
  id: string;
  quote_id?: string;
  descricao: string;
  tipo: 'servico' | 'pacote' | 'hotel' | 'passagem' | 'passeio' | 'transfer' | 'seguro' | 'outro';
  destino_cidade?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Orcamento {
  id: string;
  codigo?: string;
  cliente_id: string;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  vendedor_id?: string;
  vendedor_nome?: string;
  data_criacao?: string;
  data_validade?: string;
  moeda?: 'BRL' | 'USD' | 'EUR';
  valor_total: number;
  status: StatusOrcamento;
  observacoes?: string;
  condicoes?: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
  itens?: OrcamentoItem[];
}

export interface OrcamentoListItem extends Orcamento {
  dias_para_expirar?: number;
}

export interface OrcamentoDetalhe extends Orcamento {
  itens: OrcamentoItem[];
  interacoes?: OrcamentoInteracao[];
}

export interface OrcamentoInteracao {
  id: string;
  quote_id: string;
  tipo: 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'outro';
  status_negociacao?: string;
  data_contato?: string;
  proximo_contato?: string;
  observacoes?: string;
  usuario_id?: string;
  usuario_nome?: string;
  created_at: string;
}

export interface OrcamentoFiltros {
  busca?: string;
  status?: StatusOrcamento | 'todos';
  periodo?: 'hoje' | 'esta_semana' | 'este_mes' | 'mes_passado';
  vendedor_id?: string;
}
