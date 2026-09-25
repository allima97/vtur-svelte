import { Hono } from 'hono';
import { handleOperacaoDocumentosViagensGet } from '../operacao/documentos-viagens';
import type { ApiEnv } from '../../types';
import { handleDocumentosViagensCreatePost } from './create';
import { handleDocumentosViagensDeletePost } from './delete';
import { handleDocumentosViagensSaveTemplatePost } from './save-template';
import { handleDocumentosViagensUpdatePost } from './update';

// /api/v1/documentos-viagens/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const documentosViagensRoutes = new Hono<ApiEnv>()
  // apelido: documentos-viagens/list/+server.ts reexportava GET de ../../operacao/documentos-viagens
  .get('/list', (c) => handleOperacaoDocumentosViagensGet(c.env.event))
  .post('/create', (c) => handleDocumentosViagensCreatePost(c.env.event))
  .post('/delete', (c) => handleDocumentosViagensDeletePost(c.env.event))
  .post('/save-template', (c) => handleDocumentosViagensSaveTemplatePost(c.env.event))
  .post('/update', (c) => handleDocumentosViagensUpdatePost(c.env.event));
