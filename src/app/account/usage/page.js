import AccountClient from "../AccountClient";

export const metadata = {
  title: "Usage",
  description: "Espace prive d'usage credits et jobs IA Vibe_fx V2.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountUsagePage() {
  return <AccountClient initialView="usage" />;
}
