import React from 'react';
import { CreditCard, ShieldAlert, WalletCards } from 'lucide-react';

export default function AiCreditMeter({ runtime, estimatedCredits = 0 }) {
  const user = runtime?.user;
  const state = !runtime?.ready ? 'warning' : user?.isAnonymous ? 'warning' : user ? 'ready' : 'warning';
  const label = !runtime?.ready
    ? 'Firebase off'
    : user?.isAnonymous
      ? 'Compte anonyme'
      : user
        ? 'Compte connecte'
        : 'Connexion requise';

  return (
    <div className="vf-ai-credit-meter" data-state={state}>
      <div className="vf-ai-credit-meter__main">
        <CreditCard size={13} />
        <span>{estimatedCredits} credits estimes</span>
      </div>
      <div className="vf-ai-credit-meter__sub">
        <ShieldAlert size={12} />
        <span>{label}</span>
      </div>
      <div className="vf-ai-credit-meter__ledger">
        <span>
          <WalletCards size={12} />
          Solde et reserve verifies par le serveur
        </span>
        <a href="/pricing">Acheter credits</a>
      </div>
    </div>
  );
}
