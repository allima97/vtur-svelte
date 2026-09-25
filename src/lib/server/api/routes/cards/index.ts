import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleCardsAniversarioSvgGet } from './aniversario-svg';
import { handleCardsRenderGet } from './render';
import { handleCardsRenderPngGet } from './render-png';
import { handleCardsRenderSvgGet } from './render-svg';

// /api/v1/cards/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const cardsRoutes = new Hono<ApiEnv>()
  .get('/aniversario.svg', (c) => handleCardsAniversarioSvgGet(c.env.event))
  .get('/render', (c) => handleCardsRenderGet(c.env.event))
  .get('/render.png', (c) => handleCardsRenderPngGet(c.env.event))
  .get('/render.svg', (c) => handleCardsRenderSvgGet(c.env.event));
