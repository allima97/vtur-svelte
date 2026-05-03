import { isWasmCodegenBlockedError, renderSvgToPng } from '$lib/cards/svgToPng';
import { logServerError } from '$lib/server/v1';
import { checkRateLimit } from '$lib/server/rateLimit';
import { renderCardSvg } from '../_render';

export async function GET(event: import('@sveltejs/kit').RequestEvent) {
  try {
    const url = new URL(event.request.url);
    const format = String(url.searchParams.get("format") || "svg").trim().toLowerCase();
    const rateLimit = checkRateLimit(
      `cards-render:${format}:${event.getClientAddress?.() || 'unknown'}`,
      { max: format === "png" ? 80 : 240, windowMs: 60_000 }
    );
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

    if (format === "png") {
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
          logServerError("[cards/render] PNG indisponível no runtime", error);
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
    }

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (e: any) {
    logServerError("[cards/render] falha ao renderizar cartão", e);
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
