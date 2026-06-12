-- Migration: adicionar flags de visibilidade de seções no PDF do roteiro
-- Execute no Supabase / banco de dados da aplicação

ALTER TABLE public.roteiro_personalizado
  ADD COLUMN IF NOT EXISTS mostrar_pagamento_pdf boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mostrar_informacoes_pdf boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mostrar_rodape_pdf boolean NOT NULL DEFAULT true;
