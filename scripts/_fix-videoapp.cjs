const fs = require('fs');
const filePath = 'C:/Users/pcpor/OneDrive/Bureau/mes projet/vibe_fxV2/src/features/vibefx-studio/VideoApp.jsx';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// Lines 263-271 (0-based) = <Link href="/backoffice" ... </Link>
const newBlock = [
  '                        {isAdmin && (',
  '                            <Link',
  '                                href="/backoffice"',
  '                                data-testid="vibecut-header-backoffice"',
  '                                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-sm border border-cyan-500/35 bg-cyan-500/10 px-2.5 text-[8px] font-mono uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-500/16 hover:text-white"',
  '                                title="Ouvrir le backoffice"',
  '                            >',
  '                                <Shield size={11} />',
  '                                <span className="hidden sm:inline">Backoffice</span>',
  '                            </Link>',
  '                        )}',
];

const result = [...lines.slice(0, 263), ...newBlock, ...lines.slice(272)];
fs.writeFileSync(filePath, result.join('\n'), 'utf-8');
const verify = fs.readFileSync(filePath, 'utf-8');
console.log('isAdmin present:', verify.includes('isAdmin && ('));
console.log('useAuth present:', verify.includes('useAuth'));
console.log('done, lines:', result.length);
