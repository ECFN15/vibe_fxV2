"use client";

import dynamic from "next/dynamic";

const PublicationsManager = dynamic(() => import("@/features/publications/PublicationsManager"), {
  ssr: false,
});

export default function StudioClient() {
  return <PublicationsManager />;
}
