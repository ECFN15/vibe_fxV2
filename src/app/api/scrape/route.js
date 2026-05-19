import { scrapeResponse } from "../_midjourney/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request) {
  return scrapeResponse(request);
}
