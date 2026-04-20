import { json } from "@sveltejs/kit";
const POST = async ({ request }) => {
  try {
    const payload = await request.json().catch(() => null);
    const url = new URL(request.url);
    console.error("CLIENT_ERROR", {
      url: url.pathname,
      payload
    });
  } catch (err) {
    console.error("CLIENT_ERROR_PARSE", { message: err?.message ?? String(err) });
  }
  return json(null, { status: 204 });
};
export {
  POST
};
