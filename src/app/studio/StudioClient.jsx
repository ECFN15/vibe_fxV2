"use client";

import PublicationsManager from "@/features/publications/PublicationsManager";
import StudioAuthGate from "@/components/StudioAuthGate";

export default function StudioClient({ initialMode, initialWorkspace }) {
  return (
    <StudioAuthGate>
      <PublicationsManager initialMode={initialMode} initialWorkspace={initialWorkspace} />
    </StudioAuthGate>
  );
}
