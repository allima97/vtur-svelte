import { json } from "@sveltejs/kit";
const GET = async () => {
  return json({ ok: true, ts: (/* @__PURE__ */ new Date()).toISOString() });
};
export {
  GET
};
