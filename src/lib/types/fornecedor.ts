// Tipo completo para Fornecedor — alinhado com o schema real da tabela fornecedores
export interface Fornecedor {
  id: string;
  company_id: string;
  localizacao: 'brasil' | 'exterior';
  nome_completo: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  telefone_emergencia?: string | null;
  responsavel?: string | null;
  tipo_faturamento: 'pre_pago' | 'semanal' | 'quinzenal' | 'mensal';
  principais_servicos?: string | null;
  created_at?: string;
  updated_at?: string;
  // Campos computados (não existem no DB, usados apenas no front)
  produtos_vinculados?: number;
}

// Tipo para criação de fornecedor
export interface FornecedorCreate {
  company_id: string;
  localizacao: 'brasil' | 'exterior';
  nome_completo: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  telefone_emergencia?: string | null;
  responsavel?: string | null;
  tipo_faturamento?: 'pre_pago' | 'semanal' | 'quinzenal' | 'mensal';
  principais_servicos?: string | null;
}

// Tipo para atualização de fornecedor
export interface FornecedorUpdate {
  nome_completo?: string;
  nome_fantasia?: string | null;
  localizacao?: 'brasil' | 'exterior';
  cnpj?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  telefone_emergencia?: string | null;
  responsavel?: string | null;
  tipo_faturamento?: 'pre_pago' | 'semanal' | 'quinzenal' | 'mensal';
  principais_servicos?: string | null;
}

// Labels para os tipos de faturamento
export const TIPOS_FATURAMENTO = [
  { value: 'pre_pago', label: 'Pré-pago' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' }
] as const;

// Labels para localização
export const LOCALIZACOES = [
  { value: 'brasil', label: 'Brasil' },
  { value: 'exterior', label: 'Exterior' }
] as const;

// Estados do Brasil
export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

// Helper para formatar tipo de faturamento
export function formatarTipoFaturamento(tipo: string): string {
  const labels: Record<string, string> = {
    pre_pago: 'Pré-pago',
    semanal: 'Semanal',
    quinzenal: 'Quinzenal',
    mensal: 'Mensal'
  };
  return labels[tipo] || tipo || '-';
}
