import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleCronAlertaComissaoPost, handleCronAlertaComissaoGet } from './alerta-comissao';
import { handleCronLembretesConsultoriaPost } from './lembretes-consultoria';

// /api/v1/cron/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const cronRoutes = new Hono<ApiEnv>()
  .post('/alerta-comissao', (c) => handleCronAlertaComissaoPost(c.env.event))
  .get('/alerta-comissao', (c) => handleCronAlertaComissaoGet(c.env.event))
  .post('/lembretes-consultoria', (c) => handleCronLembretesConsultoriaPost(c.env.event));
