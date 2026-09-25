import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleRelatoriosBaseGet } from './base';
import { handleRelatoriosCidadesBuscaGet } from './cidades-busca';
import { handleRelatoriosClientesGet } from './clientes';
import { handleRelatoriosDestinosGet } from './destinos';
import { handleRelatoriosProdutosGet } from './produtos';
import { handleRelatoriosProdutosRecibosGet } from './produtos-recibos';
import { handleRelatoriosRankingGet } from './ranking';
import { handleRelatoriosRankingDebugGet, handleRelatoriosRankingDebugPost } from './ranking-debug';
import { handleRelatoriosRankingVendasGet } from './ranking-vendas';
import { handleRelatoriosVendasGet } from './vendas';
import { handleRelatoriosVendasPorClienteGet } from './vendas-por-cliente';
import { handleRelatoriosVendasPorDestinoGet } from './vendas-por-destino';
import { handleRelatoriosVendasPorProdutoGet } from './vendas-por-produto';

// /api/v1/relatorios/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const relatoriosRoutes = new Hono<ApiEnv>()
  .get('/base', (c) => handleRelatoriosBaseGet(c.env.event))
  .get('/cidades-busca', (c) => handleRelatoriosCidadesBuscaGet(c.env.event))
  .get('/clientes', (c) => handleRelatoriosClientesGet(c.env.event))
  .get('/destinos', (c) => handleRelatoriosDestinosGet(c.env.event))
  .get('/produtos', (c) => handleRelatoriosProdutosGet(c.env.event))
  .get('/produtos-recibos', (c) => handleRelatoriosProdutosRecibosGet(c.env.event))
  .get('/ranking', (c) => handleRelatoriosRankingGet(c.env.event))
  .get('/ranking-debug', (c) => handleRelatoriosRankingDebugGet(c.env.event))
  .post('/ranking-debug', (c) => handleRelatoriosRankingDebugPost(c.env.event))
  .get('/ranking-vendas', (c) => handleRelatoriosRankingVendasGet(c.env.event))
  .get('/vendas', (c) => handleRelatoriosVendasGet(c.env.event))
  .get('/vendas-por-cliente', (c) => handleRelatoriosVendasPorClienteGet(c.env.event))
  .get('/vendas-por-destino', (c) => handleRelatoriosVendasPorDestinoGet(c.env.event))
  .get('/vendas-por-produto', (c) => handleRelatoriosVendasPorProdutoGet(c.env.event));
