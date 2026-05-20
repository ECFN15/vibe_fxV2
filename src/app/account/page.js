import AccountClient from "./AccountClient";

export const metadata = {
  title: "Compte",
  description: "Dashboard prive Vibe_fx V2 pour profil, statut premium, credits, usage et securite.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPage() {
  return <AccountClient initialView="overview" />;
}
