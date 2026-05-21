"use client";

import PublicationsManager from "@/features/publications/PublicationsManager";

export default function StudioClient({ initialMode, initialWorkspace }) {
  return <PublicationsManager initialMode={initialMode} initialWorkspace={initialWorkspace} />;
}
