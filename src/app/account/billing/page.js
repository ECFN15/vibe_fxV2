import AccountClient from "../AccountClient";

export const metadata = {
  title: "Facturation",
  description: "Espace prive de facturation Vibe_fx V2.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountBillingPage() {
  return <AccountClient initialView="billing" />;
}
