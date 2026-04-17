-- Migration: Adicionar cliente_id à tabela agenda_itens
-- Created: 2026-04-04

-- Adicionar coluna cliente_id (UUID, opcional, referência à tabela clientes)
ALTER TABLE agenda_itens 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

-- Adicionar índice para melhorar performance de buscas por cliente
CREATE INDEX IF NOT EXISTS idx_agenda_itens_cliente_id ON agenda_itens(cliente_id);

-- Comentário na coluna para documentação
COMMENT ON COLUMN agenda_itens.cliente_id IS 'Referência ao cliente associado ao evento/agenda (opcional)';
