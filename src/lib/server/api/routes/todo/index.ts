import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { withRouteParams } from '../../params';
import { handleTodoBatchPost } from './batch';
import { handleTodoBoardGet } from './board';
import { handleTodoCategoryPost, handleTodoCategoryDelete } from './category';
import { handleTodoItemPost, handleTodoItemPatch, handleTodoItemDelete } from './item';
import { handleTodoItemIdGet } from './item-id';

// /api/v1/todo/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const todoRoutes = new Hono<ApiEnv>()
  .post('/batch', (c) => handleTodoBatchPost(c.env.event))
  .get('/board', (c) => handleTodoBoardGet(c.env.event))
  .post('/category', (c) => handleTodoCategoryPost(c.env.event))
  .delete('/category', (c) => handleTodoCategoryDelete(c.env.event))
  .post('/item', (c) => handleTodoItemPost(c.env.event))
  .patch('/item', (c) => handleTodoItemPatch(c.env.event))
  .delete('/item', (c) => handleTodoItemDelete(c.env.event))
  .get('/item/:id', (c) => handleTodoItemIdGet(withRouteParams(c.env.event, c.req.param())));
