// Tipos alinhados com o schema real da tabela viagens
export type StatusViagem = 'planejada' | 'confirmada' | 'em_viagem' | 'concluida' | 'cancelada';

export interface Viagem {
  id: string;
  venda_id?: string | null;
  orcamento_id?: string | null;
  company_id: string;
  responsavel_user_id?: string | null;
  cliente_id?: string | null;
  recibo_id?: string | null;
  origem?: string | null;
  destino?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  status: StatusViagem;
  observacoes?: string | null;
  follow_up_text?: string | null;
  follow_up_fechado?: boolean;
  created_at?: string;
  updated_at?: string;
  // Campos computados (não existem no DB)
  cliente_nome?: string;
  responsavel_nome?: string;
  valor_total?: number;
  numero_passageiros?: number;
  tipo_viagem?: 'nacional' | 'internacional';
}

export interface ViagemListItem extends Viagem {
  alerta_proximidade?: boolean;
}

export interface ViagemDetalhe extends Viagem {
  cliente?: {
    id: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
  } | null;
  venda?: {
    id: string;
    numero_venda?: string | null;
    valor_total?: number | null;
    valor_total_pago?: number | null;
    status?: string | null;
    data_venda?: string | null;
    recibos?: any[];
  } | null;
  recibo?: {
    id: string;
    numero_recibo?: string | null;
    numero_reserva?: string | null;
    valor_total?: number | null;
    data_inicio?: string | null;
    data_fim?: string | null;
  } | null;
  passageiros?: ViagemPassageiro[];
  vouchers?: any[];
}

export interface ViagemPassageiro {
  id: string;
  viagem_id: string;
  cliente_id: string;
  company_id: string;
  papel: 'passageiro' | 'responsavel';
  observacoes?: string | null;
  created_at?: string;
  // Join com clientes
  cliente?: {
    id: string;
    nome: string;
    cpf?: string | null;
    telefone?: string | null;
    nascimento?: string | null;
  } | null;
}

export interface ViagemFiltros {
  busca?: string;
  status?: StatusViagem | 'todas';
  periodo?: 'hoje' | 'semana' | 'mes' | 'proximos_30';
  vendedor_id?: string;
}
