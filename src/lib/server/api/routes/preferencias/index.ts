import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handlePreferenciasBaseGet } from './base';
import { handlePreferenciasCidadesBuscaGet } from './cidades-busca';
import { handlePreferenciasDeletePost } from './delete';
import { handlePreferenciasListGet } from './list';
import { handlePreferenciasSavePost } from './save';
import { handlePreferenciasSharePost } from './share';
import { handlePreferenciasShareAcceptPost } from './share-accept';
import { handlePreferenciasShareRevokePost } from './share-revoke';

// /api/v1/preferencias/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const preferenciasRoutes = new Hono<ApiEnv>()
  .get('/base', (c) => handlePreferenciasBaseGet(c.env.event))
  .get('/cidades-busca', (c) => handlePreferenciasCidadesBuscaGet(c.env.event))
  .post('/delete', (c) => handlePreferenciasDeletePost(c.env.event))
  .get('/list', (c) => handlePreferenciasListGet(c.env.event))
  .post('/save', (c) => handlePreferenciasSavePost(c.env.event))
  .post('/share', (c) => handlePreferenciasSharePost(c.env.event))
  .post('/share-accept', (c) => handlePreferenciasShareAcceptPost(c.env.event))
  .post('/share-revoke', (c) => handlePreferenciasShareRevokePost(c.env.event));
