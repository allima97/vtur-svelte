import { r as renderCardSvg } from "../../../../../../chunks/_render.js";
async function GET(event) {
  try {
    const { svg } = await renderCardSvg(event);
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (e) {
    return new Response(e?.message || "Erro ao renderizar cartão.", { status: 500 });
  }
}
export {
  GET
};
