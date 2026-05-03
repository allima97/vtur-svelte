import { isWasmCodegenBlockedError, renderSvgToPng } from '$lib/cards/svgToPng';
import { logServerError } from '$lib/server/v1';
import { checkRateLimit } from '$lib/server/rateLimit';
import { renderCardSvg } from '../_render';

export async function GET(event: import('@sveltejs/kit').RequestEvent) {
  try {
    const rateLimit = checkRateLimit(`cards-render-png:${event.getClientAddress?.() || 'unknown'}`, {
      max: 80,
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
    try {
      const png = await renderSvgToPng(svg, event.request);
      return new Response(png, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch (error) {
      if (isWasmCodegenBlockedError(error)) {
        logServerError("[cards/render.png] PNG indisponível no runtime", error);
        return new Response(
          JSON.stringify({
            error: "png_render_unavailable",
            message: "PNG rendering unavailable in current runtime.",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
              "X-Card-Render-Error": "png_render_unavailable",
            },
          }
        );
      }
      throw error;
    }
  } catch (e: any) {
    logServerError("[cards/render.png] falha ao renderizar cartão", e);
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
