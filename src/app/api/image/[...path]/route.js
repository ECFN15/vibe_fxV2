import { imageResponse } from "../../_midjourney/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request, context) {
  return imageResponse(request, context);
}
