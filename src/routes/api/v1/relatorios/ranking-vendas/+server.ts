import type { RequestEvent } from "@sveltejs/kit";
import { forwardLegacyReportGET } from "../_legacyForward";
import { GET as rankingGET } from "../ranking/+server";

export async function GET(event: RequestEvent) {
  return forwardLegacyReportGET(event, rankingGET);
}
