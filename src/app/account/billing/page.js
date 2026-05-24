import AccountClient from "../AccountClient";

export const metadata = {
  title: "Acces lifetime",
  description: "Espace prive pour acheter et consulter l'acces lifetime Vibe_fx V2.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountBillingPage() {
  return <AccountClient initialView="billing" />;
}
