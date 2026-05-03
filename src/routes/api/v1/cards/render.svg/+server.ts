import { checkRateLimit } from '$lib/server/rateLimit';
import { logServerError } from '$lib/server/v1';
import { renderCardSvg } from '../_render';

export async function GET(event: import('@sveltejs/kit').RequestEvent) {
  try {
    const rateLimit = checkRateLimit(`cards-render-svg:${event.getClientAddress?.() || 'unknown'}`, {
      max: 240,
      windowMs: 60_000
    });
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "rate_limited", message: "Muitas requisições. Tente novamente em instantes." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const { svg } = await renderCardSvg(event);
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (e: any) {
    logServerError("[cards/render.svg] falha ao renderizar cartão", e);
    return new Response(
      JSON.stringify({
        error: "card_render_error",
        message: "Erro ao renderizar cartão.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
