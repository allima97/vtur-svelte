-- Migration: Schema completo do módulo Financeiro/Conciliação
-- Data: 2026-04-04

-- ============================================
-- TABELA: formas_pagamento
-- ============================================
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50),
    cor VARCHAR(7) DEFAULT '#6b7280',
    ativo BOOLEAN DEFAULT TRUE,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: pagamentos (atualização/campos extras)
-- ============================================
-- Garantir que a tabela pagamentos existe com todos os campos
DO $$
BEGIN
    -- Verificar e adicionar colunas se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'codigo') THEN
        ALTER TABLE pagamentos ADD COLUMN codigo VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'status') THEN
        ALTER TABLE pagamentos ADD COLUMN status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'conciliado', 'divergente', 'cancelado'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'comprovante') THEN
        ALTER TABLE pagamentos ADD COLUMN comprovante TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'data_conciliacao') THEN
        ALTER TABLE pagamentos ADD COLUMN data_conciliacao TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'conciliado_por') THEN
        ALTER TABLE pagamentos ADD COLUMN conciliado_por UUID REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'observacoes') THEN
        ALTER TABLE pagamentos ADD COLUMN observacoes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'forma_pagamento_id') THEN
        ALTER TABLE pagamentos ADD COLUMN forma_pagamento_id UUID REFERENCES formas_pagamento(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'tipo') THEN
        ALTER TABLE pagamentos ADD COLUMN tipo VARCHAR(20) DEFAULT 'entrada' CHECK (tipo IN ('entrada', 'saida'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'categoria') THEN
        ALTER TABLE pagamentos ADD COLUMN categoria VARCHAR(50) DEFAULT 'venda';
    END IF;
END $$;

-- ============================================
-- TABELA: conciliacao_logs
-- ============================================
CREATE TABLE IF NOT EXISTS conciliacao_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pagamento_id UUID NOT NULL REFERENCES pagamentos(id) ON DELETE CASCADE,
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    status_anterior VARCHAR(20),
    status_novo VARCHAR(20) NOT NULL,
    observacao TEXT,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: caixa_movimentacoes
-- ============================================
CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    pagamento_id UUID REFERENCES pagamentos(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    data_movimentacao DATE NOT NULL,
    forma_pagamento_id UUID REFERENCES formas_pagamento(id),
    comprovante TEXT,
    observacoes TEXT,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
-- Índices para formas_pagamento
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_company_id ON formas_pagamento(company_id);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_ativo ON formas_pagamento(ativo);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_ordem ON formas_pagamento(ordem);

-- Índices para pagamentos
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_pagamento ON pagamentos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_cliente_id ON pagamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_id ON pagamentos(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_forma_pagamento_id ON pagamentos(forma_pagamento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_conciliacao ON pagamentos(data_conciliacao);

-- Índices para conciliacao_logs
CREATE INDEX IF NOT EXISTS idx_conciliacao_logs_pagamento_id ON conciliacao_logs(pagamento_id);
CREATE INDEX IF NOT EXISTS idx_conciliacao_logs_created_at ON conciliacao_logs(created_at);

-- Índices para caixa_movimentacoes
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_company_id ON caixa_movimentacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_data ON caixa_movimentacoes(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_tipo ON caixa_movimentacoes(tipo);

-- ============================================
-- TRIGGER PARA updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_formas_pagamento_updated_at ON formas_pagamento;
CREATE TRIGGER update_formas_pagamento_updated_at
    BEFORE UPDATE ON formas_pagamento
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_caixa_movimentacoes_updated_at ON caixa_movimentacoes;
CREATE TRIGGER update_caixa_movimentacoes_updated_at
    BEFORE UPDATE ON caixa_movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS: Formas de Pagamento
-- ============================================
INSERT INTO formas_pagamento (codigo, nome, descricao, icone, cor, ordem, ativo) VALUES
('dinheiro', 'Dinheiro', 'Pagamento em espécie', 'Banknote', '#16a34a', 1, true),
('pix', 'PIX', 'Transferência instantânea', 'QrCode', '#2563eb', 2, true),
('cartao_credito', 'Cartão de Crédito', 'Pagamento com cartão de crédito', 'CreditCard', '#7c3aed', 3, true),
('cartao_debito', 'Cartão de Débito', 'Pagamento com cartão de débito', 'CreditCard', '#0891b2', 4, true),
('boleto', 'Boleto Bancário', 'Pagamento via boleto', 'FileText', '#ea580c', 5, true),
('transferencia', 'Transferência Bancária', 'Transferência entre contas', 'ArrowLeftRight', '#0891b2', 6, true),
('cheque', 'Cheque', 'Pagamento com cheque', 'FileCheck', '#dc2626', 7, true),
('deposito', 'Depósito', 'Depósito bancário', 'Landmark', '#059669', 8, true)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE formas_pagamento IS 'Cadastro de formas de pagamento aceitas pelo sistema';
COMMENT ON TABLE conciliacao_logs IS 'Histórico de alterações de status de conciliação de pagamentos';
COMMENT ON TABLE caixa_movimentacoes IS 'Registro de movimentações de caixa (entradas e saídas)';

COMMENT ON COLUMN pagamentos.status IS 'Status do pagamento: pendente, conciliado, divergente, cancelado';
COMMENT ON COLUMN pagamentos.comprovante IS 'URL do arquivo de comprovante no storage';
COMMENT ON COLUMN pagamentos.data_conciliacao IS 'Data/hora em que o pagamento foi conciliado';
COMMENT ON COLUMN pagamentos.conciliado_por IS 'Usuário que realizou a conciliação';
COMMENT ON COLUMN pagamentos.tipo IS 'Tipo: entrada (receita) ou saida (despesa)';
