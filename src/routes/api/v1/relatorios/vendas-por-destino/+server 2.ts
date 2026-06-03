import type { RequestEvent } from "@sveltejs/kit";
import { forwardLegacyReportGET } from "../_legacyForward";
import { GET as destinosGET } from "../destinos/+server";

export async function GET(event: RequestEvent) {
  return forwardLegacyReportGET(event, destinosGET);
}
