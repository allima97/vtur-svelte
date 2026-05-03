import { renderCardSvg } from '../_render';

export async function GET(event: import('@sveltejs/kit').RequestEvent) {
  try {
    const { svg } = await renderCardSvg(event);
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (e: any) {
    console.error("[cards/render.svg] falha ao renderizar cartão", e);
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
