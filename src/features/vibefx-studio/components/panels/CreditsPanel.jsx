import React from 'react';
import { CreditCard, Gauge, LockKeyhole, Route, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';

const packs = [
    { key: 'premium_lifetime', label: 'Premium lifetime', price: '29 EUR', credits: '0', role: 'Acces outils non IA' },
    { key: 'credits_500', label: 'Starter', price: '5 EUR', credits: '500', role: 'Captions, prompts courts, tests IA' },
    { key: 'credits_1200', label: 'Createur', price: '10 EUR', credits: '1 200', role: 'Usage regulier image/text IA' },
    { key: 'credits_3200', label: 'Production', price: '25 EUR', credits: '3 200', role: 'Series, variantes, exports avances' },
    { key: 'credits_7000', label: 'Studio', price: '50 EUR', credits: '7 000', role: 'Equipe, media couteux, video IA plus tard' },
];

const useCases = [
    ['Caption / hashtags', '1-3 credits', 'Generation texte simple, faible cout provider.'],
    ['Prompt rewrite', '3-8 credits', 'Transformer une idee brute en prompt image exploitable.'],
    ['Image draft', '20-60 credits', 'Generation rapide quand un provider officiel sera valide.'],
    ['Image standard/edit', '40-140 credits', 'Creation ou retouche image avec marge et policy runtime.'],
    ['Transcription', 'Par minute', 'Sous-titres SRT/VTT selon duree audio.'],
    ['Video IA / export serveur', '300+ ou duree', 'Jobs chers, async, jamais illimites.'],
];

const safeguards = [
    { icon: ShieldCheck, title: 'Webhook only', body: 'Stripe success_url ne donne rien. Credits et premium arrivent uniquement via webhook signe.' },
    { icon: LockKeyhole, title: 'Ledger serveur', body: 'Le client ne peut pas modifier creditBalance, payments, ledger ou aiJobs.' },
    { icon: Route, title: 'Router IA bloque', body: 'Aucun provider reel expose tant que benchmark, licence, DPA et marge ne sont pas valides.' },
    { icon: Gauge, title: 'Marge calculee', body: 'Chaque feature IA doit passer par aiPricingPolicies avec buffers Stripe/Firebase/risque.' },
];

export default function CreditsPanel({ isDarkMode }) {
    const shell = isDarkMode
        ? 'bg-black text-white border-neutral-800'
        : 'bg-white text-neutral-950 border-gray-200';
    const card = isDarkMode
        ? 'border-neutral-800 bg-neutral-950/80'
        : 'border-gray-200 bg-gray-50';
    const muted = isDarkMode ? 'text-neutral-400' : 'text-gray-600';

    return (
        <section className={`h-full overflow-y-auto border-t ${shell}`}>
            <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
                <div className={`border ${card} p-5 lg:p-7 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6`}>
                    <div className="space-y-5">
                        <div className="inline-flex items-center gap-2 text-[10px] uppercase font-mono tracking-[0.22em] text-lime-300">
                            <Sparkles size={14} />
                            AI credits economy
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-balance">
                                Les credits IA sont integres au portail, pas caches dans une page externe.
                            </h2>
                            <p className={`max-w-3xl text-sm sm:text-base leading-7 ${muted}`}>
                                Premium debloque les outils non IA. Les credits paient les actions variables:
                                texte, prompts, image, transcription, musique IA et video plus tard. Aujourd'hui
                                le gateway est en mock: la mecanique credits/ledger est prete, les providers reels
                                restent bloques jusqu'au benchmark officiel.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <a href="/account/billing" className="inline-flex min-h-11 items-center gap-2 bg-lime-300 text-black px-4 font-mono text-[11px] font-black uppercase tracking-widest">
                                <WalletCards size={15} />
                                Acheter credits
                            </a>
                            <a href="/account/usage" className={`inline-flex min-h-11 items-center gap-2 border px-4 font-mono text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10' : 'border-cyan-600/30 text-cyan-800 hover:bg-cyan-50'}`}>
                                <Gauge size={15} />
                                Voir usage
                            </a>
                            <a href="/pricing" className={`inline-flex min-h-11 items-center gap-2 border px-4 font-mono text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'border-neutral-700 text-neutral-300 hover:border-lime-300/60' : 'border-gray-300 text-gray-700 hover:border-lime-600'}`}>
                                Tokenomics publique
                            </a>
                        </div>
                    </div>

                    <aside className={`border ${card} p-4 space-y-3`}>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-cyan-300">Runtime</span>
                            <CreditCard size={16} className="text-lime-300" />
                        </div>
                        {[
                            ['Credit unit', '1 credit ~= 0,01 EUR'],
                            ['Fulfillment', 'Stripe webhook'],
                            ['Debit', 'Reserve -> capture/release'],
                            ['Provider reels', 'productionAllowed=false'],
                        ].map(([label, value]) => (
                            <div key={label} className={`grid gap-1 border-t pt-3 ${isDarkMode ? 'border-neutral-800' : 'border-gray-200'}`}>
                                <span className={`text-[10px] uppercase font-mono tracking-widest ${muted}`}>{label}</span>
                                <strong className="text-sm">{value}</strong>
                            </div>
                        ))}
                    </aside>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
                    {packs.map((pack) => (
                        <article key={pack.key} className={`border ${card} p-4 min-h-[210px] flex flex-col gap-3`}>
                            <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-cyan-300">{pack.label}</span>
                            <strong className="text-3xl font-black text-lime-300">{pack.price}</strong>
                            <div className="text-xl font-black">{pack.credits} credits</div>
                            <p className={`text-sm leading-6 ${muted}`}>{pack.role}</p>
                            <a href={`/account/billing?product=${pack.key}`} className={`mt-auto inline-flex min-h-10 items-center justify-center border font-mono text-[10px] uppercase tracking-widest ${isDarkMode ? 'border-neutral-700 hover:border-lime-300/70' : 'border-gray-300 hover:border-lime-700'}`}>
                                Ouvrir
                            </a>
                        </article>
                    ))}
                </div>

                <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-4">
                    <section className={`border ${card} p-5`}>
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-xl font-black">Ce que permettent les credits</h3>
                            <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-lime-300">Examples</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] border-collapse text-sm">
                                <thead>
                                    <tr className={`border-b ${isDarkMode ? 'border-neutral-800 text-neutral-500' : 'border-gray-200 text-gray-500'}`}>
                                        <th className="py-3 pr-4 text-left font-mono text-[10px] uppercase tracking-widest">Usage</th>
                                        <th className="py-3 pr-4 text-left font-mono text-[10px] uppercase tracking-widest">Budget indicatif</th>
                                        <th className="py-3 text-left font-mono text-[10px] uppercase tracking-widest">Pourquoi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {useCases.map(([usage, budget, reason]) => (
                                        <tr key={usage} className={`border-b ${isDarkMode ? 'border-neutral-900' : 'border-gray-100'}`}>
                                            <td className="py-3 pr-4 font-bold">{usage}</td>
                                            <td className="py-3 pr-4 text-lime-300 font-mono">{budget}</td>
                                            <td className={`py-3 ${muted}`}>{reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="grid gap-3">
                        {safeguards.map(({ icon: Icon, title, body }) => (
                            <article key={title} className={`border ${card} p-4 flex gap-3`}>
                                <div className="w-10 h-10 shrink-0 grid place-items-center border border-cyan-500/30 text-cyan-300">
                                    <Icon size={17} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-black">{title}</h3>
                                    <p className={`text-sm leading-6 ${muted}`}>{body}</p>
                                </div>
                            </article>
                        ))}
                    </section>
                </div>
            </div>
        </section>
    );
}
