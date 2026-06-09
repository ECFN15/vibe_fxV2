// Script one-shot: ajoute useAuth + condition isAdmin dans VideoApp.jsx
import { readFileSync, writeFileSync } from 'fs';

const filePath = new URL('../src/features/vibefx-studio/VideoApp.jsx', import.meta.url).pathname.slice(1);
let src = readFileSync(filePath, 'utf-8');

// 1. Ajouter import useAuth + constante ADMIN_EMAIL apres les imports existants
const importAnchor = `import { useAiLaunchSettings } from '@/hooks/useAiLaunchSettings';`;
const importAddition = `import { useAiLaunchSettings } from '@/hooks/useAiLaunchSettings';
import { useAuth } from '@/context/AuthContext';

const ADMIN_EMAIL = 'matthis.fradin2@gmail.com';`;
src = src.replace(importAnchor, importAddition);

// 2. Ajouter isAdmin apres useAiLaunchSettings hook
const hookAnchor = `    const { aiInterfacesEnabled } = useAiLaunchSettings();`;
const hookAddition = `    const { aiInterfacesEnabled } = useAiLaunchSettings();
    const { user } = useAuth();
    const isAdmin = user?.email === ADMIN_EMAIL;`;
src = src.replace(hookAnchor, hookAddition);

// 3. Wrapper le lien Backoffice avec {isAdmin && (...)}
const linkOld = `                        <Link
                            href="/backoffice"
                            data-testid="vibecut-header-backoffice"
                            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-sm border border-cyan-500/35 bg-cyan-500/10 px-2.5 text-[8px] font-mono uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-500/16 hover:text-white"
                            title="Ouvrir le backoffice"
                        >
                            <Shield size={11} />
                            <span className="hidden sm:inline">Backoffice</span>
                        </Link>`;
const linkNew = `                        {isAdmin && (
                            <Link
                                href="/backoffice"
                                data-testid="vibecut-header-backoffice"
                                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-sm border border-cyan-500/35 bg-cyan-500/10 px-2.5 text-[8px] font-mono uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-500/16 hover:text-white"
                                title="Ouvrir le backoffice"
                            >
                                <Shield size={11} />
                                <span className="hidden sm:inline">Backoffice</span>
                            </Link>
                        )}`;
src = src.replace(linkOld, linkNew);

writeFileSync(filePath, src, 'utf-8');
console.log('VideoApp.jsx patched OK');
