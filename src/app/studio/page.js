import StudioClient from "./StudioClient";

export const metadata = {
  title: "Studio",
  description: "Studio Vibe_fx V2 pour composer une image, preparer une publication et lancer la publication reseaux.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioPage({ searchParams }) {
  const params = await searchParams;
  const studioWorkspaces = new Set(["studio", "layout", "library", "soundtrack", "vision-pro", "video"]);
  const requestedWorkspace = typeof params?.workspace === "string" ? params.workspace : "";
  const initialWorkspace = studioWorkspaces.has(requestedWorkspace) ? requestedWorkspace : "layout";
  return (
    <StudioClient
      initialMode="layout"
      initialWorkspace={initialWorkspace}
    />
  );
}
