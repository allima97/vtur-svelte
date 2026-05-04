import type { RequestEvent } from "@sveltejs/kit";
import { forwardLegacyReportGET } from "../_legacyForward";
import { GET as produtosGET } from "../produtos/+server";

export async function GET(event: RequestEvent) {
  return forwardLegacyReportGET(event, produtosGET);
}
