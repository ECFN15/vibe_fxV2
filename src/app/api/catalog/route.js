import { catalogResponse } from "../_midjourney/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request) {
  return catalogResponse(request);
}
