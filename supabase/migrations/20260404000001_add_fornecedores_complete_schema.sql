-- Migration: Adicionar todos os campos à tabela fornecedores
-- Data: 2026-04-04

-- Adicionar colunas faltantes à tabela fornecedores
ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'outro',
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS estado VARCHAR(2),
ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
ADD COLUMN IF NOT EXISTS contato_nome VARCHAR(100),
ADD COLUMN IF NOT EXISTS contato_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contato_telefone VARCHAR(50),
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Criar índice para busca por código
CREATE INDEX IF NOT EXISTS idx_fornecedores_codigo ON fornecedores(codigo);

-- Criar índice para busca por tipo
CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo ON fornecedores(tipo);

-- Comentários nas colunas
COMMENT ON COLUMN fornecedores.codigo IS 'Código único do fornecedor (ex: FOR-001)';
COMMENT ON COLUMN fornecedores.tipo IS 'Tipo: hotel, companhia_aerea, operadora, transfer, seguro, outro';
COMMENT ON COLUMN fornecedores.website IS 'Website do fornecedor';
COMMENT ON COLUMN fornecedores.endereco IS 'Endereço completo';
COMMENT ON COLUMN fornecedores.cidade IS 'Cidade';
COMMENT ON COLUMN fornecedores.estado IS 'UF (2 caracteres)';
COMMENT ON COLUMN fornecedores.cep IS 'CEP formatado';
COMMENT ON COLUMN fornecedores.contato_nome IS 'Nome do contato principal';
COMMENT ON COLUMN fornecedores.contato_email IS 'Email do contato';
COMMENT ON COLUMN fornecedores.contato_telefone IS 'Telefone do contato';
COMMENT ON COLUMN fornecedores.rating IS 'Avaliação de 0 a 5 estrelas';
COMMENT ON COLUMN fornecedores.observacoes IS 'Observações gerais';
