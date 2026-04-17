import type { TipoPessoa } from './shared';

export interface Cliente {
  id: string;
  nome: string;
  nome_completo?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cpf?: string;
  cnpj?: string;
  tipo_pessoa?: TipoPessoa;
  rg?: string;
  genero?: string;
  data_nascimento?: string;
  nacionalidade?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string | null; // campo legado, não existe no schema atual
  cidade?: string;
  estado?: string;
  cep?: string;
  classificacao?: string;
  tags?: string[];
  tipo_cliente?: string;
  notas?: string;
  ativo?: boolean;
  active?: boolean;
  company_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClienteListItem extends Cliente {
  total_gasto?: number;
  ultima_compra?: string;
  total_orcamentos?: number;
  total_vendas?: number;
}

export interface ClienteDetalhe extends Cliente {
  acompanhantes?: Acompanhante[];
  historico_vendas?: ClienteHistoricoVenda[];
  historico_orcamentos?: ClienteHistoricoOrcamento[];
}

export interface Acompanhante {
  id: string;
  cliente_id: string;
  company_id?: string;
  nome_completo: string;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  grau_parentesco?: string | null;
  data_nascimento?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClienteHistoricoVenda {
  id: string;
  data_venda?: string;
  destino?: string;
  cidade?: string;
  data_embarque?: string;
  valor_total?: number;
  valor_taxas?: number;
  vinculo?: 'titular' | 'passageiro';
  status?: string;
}

export interface ClienteHistoricoOrcamento {
  id: string;
  codigo?: string;
  data_criacao?: string;
  valor_total?: number;
  status?: string;
}

export interface ClienteFiltros {
  busca?: string;
  status?: string;
  estado?: string;
  tipo_pessoa?: TipoPessoa;
  classificacao?: string;
  aniversariante_hoje?: boolean;
}
