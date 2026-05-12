import type { RequestEvent } from "@sveltejs/kit";
import { forwardLegacyReportGET } from "../_legacyForward";
import { GET as clientesGET } from "../clientes/+server";

export async function GET(event: RequestEvent) {
  return forwardLegacyReportGET(event, clientesGET);
}
