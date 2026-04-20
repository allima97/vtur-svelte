import { GET as GET$1 } from "../clientes/_server.ts.js";
function buildForwardUrl(event) {
  const url = new URL(event.url);
  const inicio = url.searchParams.get("inicio");
  const fim = url.searchParams.get("fim");
  const companyId = url.searchParams.get("company_id");
  if (inicio && !url.searchParams.get("data_inicio")) url.searchParams.set("data_inicio", inicio);
  if (fim && !url.searchParams.get("data_fim")) url.searchParams.set("data_fim", fim);
  if (companyId && !url.searchParams.get("empresa_id")) url.searchParams.set("empresa_id", companyId);
  return url;
}
async function GET(event) {
  return GET$1({ ...event, url: buildForwardUrl(event) });
}
export {
  GET
};
