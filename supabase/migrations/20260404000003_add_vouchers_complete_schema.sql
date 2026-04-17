-- Migration: Schema completo de Vouchers com Wizard de 4 Etapas
-- Data: 2026-04-04

-- ============================================
-- TABELA PRINCIPAL: vouchers
-- ============================================

-- Garantir que a tabela vouchers existe com todos os campos necessários
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Etapa 1: Dados da Viagem
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('special_tours', 'europamundo')),
    nome VARCHAR(255) NOT NULL,
    codigo_systur VARCHAR(100),
    codigo_fornecedor VARCHAR(100),
    reserva_online VARCHAR(100),
    data_inicio DATE,
    data_fim DATE,
    tipo_acomodacao VARCHAR(100),
    operador VARCHAR(255),
    resumo TEXT,
    passageiros TEXT,
    
    -- Status e controle
    ativo BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado', 'cancelado')),
    
    -- Etapa 4: Extra Data (JSON)
    extra_data JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas que podem estar faltando (migração incremental)
DO $$
BEGIN
    -- Colunas da Etapa 1
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'provider') THEN
        ALTER TABLE vouchers ADD COLUMN provider VARCHAR(50) DEFAULT 'special_tours' CHECK (provider IN ('special_tours', 'europamundo'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'codigo_systur') THEN
        ALTER TABLE vouchers ADD COLUMN codigo_systur VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'codigo_fornecedor') THEN
        ALTER TABLE vouchers ADD COLUMN codigo_fornecedor VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'reserva_online') THEN
        ALTER TABLE vouchers ADD COLUMN reserva_online VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'tipo_acomodacao') THEN
        ALTER TABLE vouchers ADD COLUMN tipo_acomodacao VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'operador') THEN
        ALTER TABLE vouchers ADD COLUMN operador VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'resumo') THEN
        ALTER TABLE vouchers ADD COLUMN resumo TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'passageiros') THEN
        ALTER TABLE vouchers ADD COLUMN passageiros TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'data_inicio') THEN
        ALTER TABLE vouchers ADD COLUMN data_inicio DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'data_fim') THEN
        ALTER TABLE vouchers ADD COLUMN data_fim DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'extra_data') THEN
        ALTER TABLE vouchers ADD COLUMN extra_data JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'status') THEN
        ALTER TABLE vouchers ADD COLUMN status VARCHAR(50) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado', 'cancelado'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'ativo') THEN
        ALTER TABLE vouchers ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ============================================
-- TABELA: voucher_dias (Etapa 2: Dia a Dia)
-- ============================================
CREATE TABLE IF NOT EXISTS voucher_dias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    
    -- Dados do dia
    dia_numero INTEGER NOT NULL,
    titulo VARCHAR(255),
    descricao TEXT,
    data_referencia DATE,
    cidade VARCHAR(255),
    ordem INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: voucher_hoteis (Etapa 3: Hotéis)
-- ============================================
CREATE TABLE IF NOT EXISTS voucher_hoteis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    
    -- Dados do hotel
    cidade VARCHAR(255) NOT NULL,
    hotel VARCHAR(255) NOT NULL,
    endereco TEXT,
    data_inicio DATE,
    data_fim DATE,
    noites INTEGER,
    telefone VARCHAR(100),
    contato VARCHAR(255),
    status VARCHAR(100),
    observacao TEXT,
    ordem INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: voucher_assets (Imagens e logos)
-- ============================================
CREATE TABLE IF NOT EXISTS voucher_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('cvc', 'special_tours', 'europamundo', 'generic')),
    asset_kind VARCHAR(50) NOT NULL CHECK (asset_kind IN ('logo', 'image', 'app_icon')),
    label VARCHAR(255),
    
    storage_bucket VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    
    ativo BOOLEAN DEFAULT TRUE,
    ordem INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

-- Índices para vouchers
CREATE INDEX IF NOT EXISTS idx_vouchers_company_id ON vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_provider ON vouchers(provider);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_ativo ON vouchers(ativo);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_at ON vouchers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vouchers_data_inicio ON vouchers(data_inicio);

-- Índices para voucher_dias
CREATE INDEX IF NOT EXISTS idx_voucher_dias_voucher_id ON voucher_dias(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_dias_ordem ON voucher_dias(ordem);

-- Índices para voucher_hoteis
CREATE INDEX IF NOT EXISTS idx_voucher_hoteis_voucher_id ON voucher_hoteis(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_hoteis_ordem ON voucher_hoteis(ordem);
CREATE INDEX IF NOT EXISTS idx_voucher_hoteis_data_inicio ON voucher_hoteis(data_inicio);

-- Índices para voucher_assets
CREATE INDEX IF NOT EXISTS idx_voucher_assets_company_id ON voucher_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_voucher_assets_provider ON voucher_assets(provider);
CREATE INDEX IF NOT EXISTS idx_voucher_assets_kind ON voucher_assets(asset_kind);

-- ============================================
-- TRIGGER PARA updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vouchers_updated_at ON vouchers;
CREATE TRIGGER update_vouchers_updated_at
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_voucher_assets_updated_at ON voucher_assets;
CREATE TRIGGER update_voucher_assets_updated_at
    BEFORE UPDATE ON voucher_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE vouchers IS 'Tabela principal de vouchers do wizard de 4 etapas';
COMMENT ON COLUMN vouchers.provider IS 'Fornecedor: special_tours ou europamundo';
COMMENT ON COLUMN vouchers.extra_data IS 'JSON com dados da Etapa 4: traslados, emergência, apps, etc.';
COMMENT ON COLUMN vouchers.status IS 'Status: rascunho, finalizado ou cancelado';

COMMENT ON TABLE voucher_dias IS 'Dias do circuito (Etapa 2 do wizard)';
COMMENT ON TABLE voucher_hoteis IS 'Hotéis confirmados (Etapa 3 do wizard)';
COMMENT ON TABLE voucher_assets IS 'Assets para vouchers (logos, imagens, app icons)';
