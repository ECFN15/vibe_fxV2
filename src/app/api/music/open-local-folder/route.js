import { exec } from 'node:child_process';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
    // Block in production for security
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Disponible uniquement en developpement.' }, { status: 403 });
    }

    const importDir = path.join(process.cwd(), 'public', 'music', 'local-imports');

    return new Promise((resolve) => {
        const command = process.platform === 'win32'
            ? `explorer.exe "${importDir}"`
            : process.platform === 'darwin'
                ? `open "${importDir}"`
                : `xdg-open "${importDir}"`;

        exec(command, (error) => {
            if (error) {
                console.error('[music-local] failed to open folder:', error);
                resolve(NextResponse.json({ success: false, error: error.message }, { status: 500 }));
            } else {
                resolve(NextResponse.json({ success: true }));
            }
        });
    });
}
