import { resetResponse } from "../_midjourney/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST() {
  return resetResponse();
}
