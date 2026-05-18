import StudioClient from "./StudioClient";

export const metadata = {
  title: "Studio",
  description: "Studio Vibe_fx V2 pour composer une image, preparer une publication et lancer la publication reseaux.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioPage() {
  return <StudioClient />;
}
