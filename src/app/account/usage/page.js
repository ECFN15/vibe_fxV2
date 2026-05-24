import AccountClient from "../AccountClient";

export const metadata = {
  title: "Activite",
  description: "Espace prive d'activite Vibe_fx V2.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountUsagePage() {
  return <AccountClient initialView="usage" />;
}
