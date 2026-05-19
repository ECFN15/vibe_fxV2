import { deleteCatalogResponse } from "../../_midjourney/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function DELETE(request, context) {
  return deleteCatalogResponse(request, context);
}
