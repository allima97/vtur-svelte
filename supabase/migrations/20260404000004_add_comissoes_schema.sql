-- Migration: Criar schema completo do módulo de comissões
-- Data: 2026-04-04

-- ============================================
-- TABELA: regras_comissao
-- Regras de comissão para vendedores
-- ============================================
CREATE TABLE IF NOT EXISTS regras_comissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    
    -- Tipo de regra
    tipo VARCHAR(20) NOT NULL DEFAULT 'GERAL' CHECK (tipo IN ('GERAL', 'ESCALONAVEL')),
    
    -- Percentuais para regra GERAL
    meta_nao_atingida DECIMAL(5,2) DEFAULT 0.00,  -- Percentual quando meta não é atingida
    meta_atingida DECIMAL(5,2) DEFAULT 0.00,      -- Percentual quando meta é atingida
    super_meta DECIMAL(5,2) DEFAULT 0.00,         -- Percentual quando supera meta
    
    -- Status
    ativo BOOLEAN DEFAULT TRUE,
    
    -- Relacionamentos
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validações
    CONSTRAINT chk_meta_nao_atingida CHECK (meta_nao_atingida >= 0 AND meta_nao_atingida <= 100),
    CONSTRAINT chk_meta_atingida CHECK (meta_atingida >= 0 AND meta_atingida <= 100),
    CONSTRAINT chk_super_meta CHECK (super_meta >= 0 AND super_meta <= 100)
);

-- Índices para regras_comissao
CREATE INDEX IF NOT EXISTS idx_regras_comissao_company ON regras_comissao(company_id);
CREATE INDEX IF NOT EXISTS idx_regras_comissao_ativo ON regras_comissao(ativo);
CREATE INDEX IF NOT EXISTS idx_regras_comissao_tipo ON regras_comissao(tipo);
CREATE INDEX IF NOT EXISTS idx_regras_comissao_created_by ON regras_comissao(created_by);

-- Comentários
COMMENT ON TABLE regras_comissao IS 'Regras de comissão para vendedores';
COMMENT ON COLUMN regras_comissao.tipo IS 'Tipo: GERAL (percentual fixo) ou ESCALONAVEL (faixas)';
COMMENT ON COLUMN regras_comissao.meta_nao_atingida IS 'Percentual quando vendedor não atinge meta (0-100)';
COMMENT ON COLUMN regras_comissao.meta_atingida IS 'Percentual quando vendedor atinge meta (0-100)';
COMMENT ON COLUMN regras_comissao.super_meta IS 'Percentual quando vendedor supera meta (0-100)';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_regras_comissao_updated_at ON regras_comissao;
CREATE TRIGGER trg_regras_comissao_updated_at
    BEFORE UPDATE ON regras_comissao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: regras_comissao_tiers
-- Faixas escalonáveis de comissão
-- ============================================
CREATE TABLE IF NOT EXISTS regras_comissao_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento com regra
    regra_id UUID NOT NULL REFERENCES regras_comissao(id) ON DELETE CASCADE,
    
    -- Identificação da faixa
    faixa VARCHAR(10) NOT NULL CHECK (faixa IN ('PRE', 'POS')),
    ordem INTEGER NOT NULL DEFAULT 0,
    
    -- Limites da faixa (percentual de vendas)
    de_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,    -- Percentual inicial
    ate_pct DECIMAL(5,2) NOT NULL DEFAULT 100.00, -- Percentual final
    
    -- Incrementos
    inc_pct_meta DECIMAL(5,2) DEFAULT 0.00,       -- Incremento da meta (%)
    inc_pct_comissao DECIMAL(5,2) DEFAULT 0.00,   -- Incremento da comissão (%)
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validações
    CONSTRAINT chk_de_pct CHECK (de_pct >= 0 AND de_pct <= 100),
    CONSTRAINT chk_ate_pct CHECK (ate_pct >= 0 AND ate_pct <= 100),
    CONSTRAINT chk_faixa_ordem UNIQUE (regra_id, faixa, ordem),
    CONSTRAINT chk_limites_faixa CHECK (de_pct < ate_pct)
);

-- Índices para tiers
CREATE INDEX IF NOT EXISTS idx_regras_tiers_regra ON regras_comissao_tiers(regra_id);
CREATE INDEX IF NOT EXISTS idx_regras_tiers_faixa ON regras_comissao_tiers(faixa);

-- Comentários
COMMENT ON TABLE regras_comissao_tiers IS 'Faixas escalonáveis de comissão';
COMMENT ON COLUMN regras_comissao_tiers.faixa IS 'Faixa: PRE (pré-meta) ou POS (pós-meta)';
COMMENT ON COLUMN regras_comissao_tiers.de_pct IS 'Percentual inicial da faixa';
COMMENT ON COLUMN regras_comissao_tiers.ate_pct IS 'Percentual final da faixa';
COMMENT ON COLUMN regras_comissao_tiers.inc_pct_meta IS 'Incremento da meta nesta faixa';
COMMENT ON COLUMN regras_comissao_tiers.inc_pct_comissao IS 'Incremento da comissão nesta faixa';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_regras_comissao_tiers_updated_at ON regras_comissao_tiers;
CREATE TRIGGER trg_regras_comissao_tiers_updated_at
    BEFORE UPDATE ON regras_comissao_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: comissoes
-- Registro de comissões geradas e pagamentos
-- ============================================
CREATE TABLE IF NOT EXISTS comissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamentos
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    vendedor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    regra_id UUID REFERENCES regras_comissao(id) ON DELETE SET NULL,
    
    -- Dados da comissão
    valor_venda DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    valor_comissionavel DECIMAL(15,2) NOT NULL DEFAULT 0.00,  -- valor_venda - valor_nao_comissionado
    percentual_aplicado DECIMAL(5,2) NOT NULL DEFAULT 0.00,   -- % aplicado
    valor_comissao DECIMAL(15,2) NOT NULL DEFAULT 0.00,       -- valor calculado
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'PAGA', 'CANCELADA')),
    
    -- Dados do pagamento
    data_pagamento DATE,
    observacoes_pagamento TEXT,
    pago_por UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Período de referência
    mes_referencia INTEGER CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
    ano_referencia INTEGER CHECK (ano_referencia >= 2000 AND ano_referencia <= 2100),
    
    -- Relacionamentos empresa
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validações
    CONSTRAINT chk_percentual_aplicado CHECK (percentual_aplicado >= 0 AND percentual_aplicado <= 100),
    CONSTRAINT chk_mes_referencia CHECK (mes_referencia IS NULL OR (mes_referencia >= 1 AND mes_referencia <= 12)),
    CONSTRAINT chk_valor_comissao CHECK (valor_comissao >= 0),
    CONSTRAINT chk_valor_comissionavel CHECK (valor_comissionavel >= 0)
);

-- Índices para comissoes
CREATE INDEX IF NOT EXISTS idx_comissoes_venda ON comissoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_regra ON comissoes(regra_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_company ON comissoes(company_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_data_pagamento ON comissoes(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_comissoes_referencia ON comissoes(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_created_at ON comissoes(created_at);

-- Índice único para evitar duplicatas (uma comissão por venda/vendedor)
CREATE UNIQUE INDEX IF NOT EXISTS idx_comissoes_unica 
ON comissoes(venda_id, vendedor_id) 
WHERE status NOT IN ('CANCELADA');

-- Comentários
COMMENT ON TABLE comissoes IS 'Registro de comissões geradas e pagamentos';
COMMENT ON COLUMN comissoes.valor_comissionavel IS 'Valor base para cálculo (venda - não comissionado)';
COMMENT ON COLUMN comissoes.percentual_aplicado IS 'Percentual aplicado no momento do cálculo';
COMMENT ON COLUMN comissoes.status IS 'Status: PENDENTE, PROCESSANDO, PAGA, CANCELADA';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_comissoes_updated_at ON comissoes;
CREATE TRIGGER trg_comissoes_updated_at
    BEFORE UPDATE ON comissoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: vendedor_regras_comissao
-- Associação de vendedores às regras de comissão
-- ============================================
CREATE TABLE IF NOT EXISTS vendedor_regras_comissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    vendedor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    regra_id UUID NOT NULL REFERENCES regras_comissao(id) ON DELETE CASCADE,
    
    -- Período de vigência
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    
    -- Prioridade (para quando vendedor tem múltiplas regras)
    prioridade INTEGER DEFAULT 1,
    
    -- Status
    ativo BOOLEAN DEFAULT TRUE,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_periodo CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    CONSTRAINT chk_vendedor_regra_unica UNIQUE (vendedor_id, regra_id, data_inicio)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vendedor_regras_vendedor ON vendedor_regras_comissao(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_regras_regra ON vendedor_regras_comissao(regra_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_regras_ativo ON vendedor_regras_comissao(ativo);
CREATE INDEX IF NOT EXISTS idx_vendedor_regras_periodo ON vendedor_regras_comissao(data_inicio, data_fim);

-- Comentários
COMMENT ON TABLE vendedor_regras_comissao IS 'Associação de vendedores às regras de comissão';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_vendedor_regras_updated_at ON vendedor_regras_comissao;
CREATE TRIGGER trg_vendedor_regras_updated_at
    BEFORE UPDATE ON vendedor_regras_comissao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para calcular comissão baseada na regra do vendedor
CREATE OR REPLACE FUNCTION calcular_comissao_venda(
    p_venda_id UUID,
    p_vendedor_id UUID
) RETURNS TABLE (
    valor_comissao DECIMAL(15,2),
    percentual_aplicado DECIMAL(5,2),
    regra_id UUID,
    regra_nome VARCHAR(255),
    valor_comissionavel DECIMAL(15,2)
) AS $$
DECLARE
    v_valor_venda DECIMAL(15,2);
    v_valor_nao_comissionado DECIMAL(15,2);
    v_valor_comissionavel DECIMAL(15,2);
    v_regra_id UUID;
    v_regra_tipo VARCHAR(20);
    v_meta_nao_atingida DECIMAL(5,2);
    v_meta_atingida DECIMAL(5,2);
    v_super_meta DECIMAL(5,2);
    v_percentual DECIMAL(5,2);
    v_valor_comissao DECIMAL(15,2);
    v_regra_nome VARCHAR(255);
BEGIN
    -- Busca dados da venda
    SELECT 
        COALESCE(v.valor_total, 0),
        COALESCE(v.valor_nao_comissionado, 0)
    INTO v_valor_venda, v_valor_nao_comissionado
    FROM vendas v
    WHERE v.id = p_venda_id;
    
    IF v_valor_venda IS NULL THEN
        RAISE EXCEPTION 'Venda não encontrada: %', p_venda_id;
    END IF;
    
    -- Calcula valor comissionável
    v_valor_comissionavel := v_valor_venda - v_valor_nao_comissionado;
    
    IF v_valor_comissionavel <= 0 THEN
        RETURN QUERY SELECT 
            0::DECIMAL(15,2), 
            0::DECIMAL(5,2), 
            NULL::UUID, 
            'Sem valor comissionável'::VARCHAR(255),
            v_valor_comissionavel;
        RETURN;
    END IF;
    
    -- Busca regra ativa do vendedor
    SELECT 
        rc.id,
        rc.tipo,
        rc.meta_nao_atingida,
        rc.meta_atingida,
        rc.super_meta,
        rc.nome
    INTO v_regra_id, v_regra_tipo, v_meta_nao_atingida, v_meta_atingida, v_super_meta, v_regra_nome
    FROM vendedor_regras_comissao vrc
    JOIN regras_comissao rc ON rc.id = vrc.regra_id
    WHERE vrc.vendedor_id = p_vendedor_id
      AND vrc.ativo = TRUE
      AND rc.ativo = TRUE
      AND vrc.data_inicio <= CURRENT_DATE
      AND (vrc.data_fim IS NULL OR vrc.data_fim >= CURRENT_DATE)
    ORDER BY vrc.prioridade DESC, vrc.created_at DESC
    LIMIT 1;
    
    -- Se não encontrou regra, usa 0%
    IF v_regra_id IS NULL THEN
        RETURN QUERY SELECT 
            0::DECIMAL(15,2), 
            0::DECIMAL(5,2), 
            NULL::UUID, 
            'Sem regra configurada'::VARCHAR(255),
            v_valor_comissionavel;
        RETURN;
    END IF;
    
    -- Calcula percentual baseado no tipo
    IF v_regra_tipo = 'GERAL' THEN
        -- Para regra geral, usa meta_atingida como padrão
        v_percentual := COALESCE(v_meta_atingida, 0);
    ELSE
        -- Para regra escalonável, busca a faixa adequada
        -- TODO: Implementar lógica de faixas escalonáveis baseada em histórico
        v_percentual := COALESCE(v_meta_atingida, 0);
    END IF;
    
    -- Calcula valor da comissão
    v_valor_comissao := (v_valor_comissionavel * v_percentual) / 100;
    
    RETURN QUERY SELECT 
        v_valor_comissao, 
        v_percentual, 
        v_regra_id, 
        v_regra_nome,
        v_valor_comissionavel;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_comissao_venda IS 'Calcula a comissão para uma venda específica';

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE regras_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE regras_comissao_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedor_regras_comissao ENABLE ROW LEVEL SECURITY;

-- Políticas para regras_comissao
CREATE POLICY "regras_comissao_select" ON regras_comissao
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        ) OR created_by = auth.uid()
    );

CREATE POLICY "regras_comissao_insert" ON regras_comissao
    FOR INSERT WITH CHECK (
        created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND company_id = regras_comissao.company_id)
    );

CREATE POLICY "regras_comissao_update" ON regras_comissao
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM users u 
                JOIN user_types ut ON u.user_type_id = ut.id 
                WHERE u.id = auth.uid() 
                AND (ut.name IN ('ADMIN', 'MASTER', 'GESTOR')))
    );

CREATE POLICY "regras_comissao_delete" ON regras_comissao
    FOR DELETE USING (
        created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM users u 
                JOIN user_types ut ON u.user_type_id = ut.id 
                WHERE u.id = auth.uid() 
                AND (ut.name IN ('ADMIN', 'MASTER')))
    );

-- Políticas para regras_comissao_tiers
CREATE POLICY "regras_tiers_select" ON regras_comissao_tiers
    FOR SELECT USING (
        regra_id IN (
            SELECT id FROM regras_comissao 
            WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "regras_tiers_all" ON regras_comissao_tiers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u 
                JOIN user_types ut ON u.user_type_id = ut.id 
                WHERE u.id = auth.uid() 
                AND (ut.name IN ('ADMIN', 'MASTER', 'GESTOR')))
    );

-- Políticas para comissoes
CREATE POLICY "comissoes_select" ON comissoes
    FOR SELECT USING (
        vendedor_id = auth.uid() OR
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid()) OR
        EXISTS (SELECT 1 FROM users u 
                JOIN user_types ut ON u.user_type_id = ut.id 
                WHERE u.id = auth.uid() 
                AND (ut.name IN ('ADMIN', 'MASTER', 'GESTOR')))
    );

CREATE POLICY "comissoes_all" ON comissoes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u 
                JOIN user_types ut ON u.user_type_id = ut.id 
                WHERE u.id = auth.uid() 
                AND (ut.name IN ('ADMIN', 'MASTER', 'GESTOR', 'FINANCEIRO')))
    );

-- Políticas para vendedor_regras_comissao
CREATE POLICY "vendedor_regras_select" ON vendedor_regras_comissao
    FOR SELECT USING (
        vendedor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users u 
                WHERE u.id = auth.uid() 
                AND (u.company_id IN (
                    SELECT company_id FROM regras_comissao 
                    WHERE id = vendedor_regras_comissao.regra_id
                )))
    );

CREATE POLICY "vendedor_regras_all" ON vendedor_regras_comissao
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u 
                JOIN user_types ut ON u.user_type_id = ut.id 
                WHERE u.id = auth.uid() 
                AND (ut.name IN ('ADMIN', 'MASTER', 'GESTOR')))
    );
