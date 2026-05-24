import AccountClient from "./AccountClient";

export const metadata = {
  title: "Compte",
  description: "Espace prive Vibe_fx V2 pour profil, acces lifetime et achats.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPage() {
  return <AccountClient initialView="overview" />;
}
