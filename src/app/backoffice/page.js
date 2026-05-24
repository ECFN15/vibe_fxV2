import BackofficeClient from "./BackofficeClient";

export const metadata = {
  title: "Backoffice",
  description: "Backoffice temporaire Vibe_fx V2 pour preparer le lancement sans interfaces IA.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BackofficePage() {
  return <BackofficeClient />;
}
