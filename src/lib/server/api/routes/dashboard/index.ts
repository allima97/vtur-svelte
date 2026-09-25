import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleDashboardAniversariantesGet } from './aniversariantes';
import { handleDashboardBaseGet } from './base';
import { handleDashboardComparativoEmpresasGet } from './comparativo-empresas';
import { handleDashboardConsultoriasGet } from './consultorias';
import { handleDashboardDebugAggregatesGet } from './debug-aggregates';
import { handleDashboardEvolucaoAnualGet } from './evolucao-anual';
import { handleDashboardFollowUpsGet } from './follow-ups';
import { handleDashboardSummaryGet } from './summary';
import { handleDashboardUltimasComprasGet } from './ultimas-compras';
import { handleDashboardViagensGet } from './viagens';
import { handleDashboardWidgetsGet, handleDashboardWidgetsPost } from './widgets';

// /api/v1/dashboard/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const dashboardRoutes = new Hono<ApiEnv>()
  .get('/aniversariantes', (c) => handleDashboardAniversariantesGet(c.env.event))
  .get('/base', (c) => handleDashboardBaseGet(c.env.event))
  .get('/comparativo-empresas', (c) => handleDashboardComparativoEmpresasGet(c.env.event))
  .get('/consultorias', (c) => handleDashboardConsultoriasGet(c.env.event))
  .get('/debug-aggregates', (c) => handleDashboardDebugAggregatesGet(c.env.event))
  .get('/evolucao-anual', (c) => handleDashboardEvolucaoAnualGet(c.env.event))
  .get('/follow-ups', (c) => handleDashboardFollowUpsGet(c.env.event))
  .get('/summary', (c) => handleDashboardSummaryGet(c.env.event))
  .get('/ultimas-compras', (c) => handleDashboardUltimasComprasGet(c.env.event))
  .get('/viagens', (c) => handleDashboardViagensGet(c.env.event))
  .get('/widgets', (c) => handleDashboardWidgetsGet(c.env.event))
  .post('/widgets', (c) => handleDashboardWidgetsPost(c.env.event));
