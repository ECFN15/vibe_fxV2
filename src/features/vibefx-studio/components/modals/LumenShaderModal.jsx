import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';

const LUMEN_EMBED_SRC = '/vendor/lumen/index.html?embed=vibefx';

export default function LumenShaderModal({ isOpen, onClose, onUseBackground }) {
    const iframeRef = useRef(null);
    const [isApplying, setIsApplying] = useState(false);

    const requestBackground = useCallback(() => {
        const target = iframeRef.current?.contentWindow;
        if (!target) return;
        setIsApplying(true);
        target.postMessage({ source: 'vibefx', type: 'vibefx:capture-lumen' }, window.location.origin);
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data || {};
            if (data.source !== 'lumen-shaders') return;

            if (data.type === 'lumen:use-background') {
                setIsApplying(false);
                onUseBackground?.(data.payload);
            }

            if (data.type === 'lumen:error') {
                setIsApplying(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        window.addEventListener('message', handleMessage);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, onUseBackground]);

    useEffect(() => {
        if (!isOpen) setIsApplying(false);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="vibefx-lumen-layer" role="dialog" aria-modal="true" aria-label="Lumen shader studio">
            <section className="vibefx-lumen-shell">
                <header className="vibefx-lumen-header">
                    <div className="vibefx-lumen-title">
                        <Sparkles size={15} />
                        <span>Lumen shader studio</span>
                    </div>
                    <div className="vibefx-lumen-actions">
                        <button type="button" className="vibefx-lumen-apply" onClick={requestBackground} disabled={isApplying}>
                            {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            <span>{isApplying ? 'Rendu...' : 'Utiliser comme fond'}</span>
                        </button>
                        <button type="button" className="vibefx-lumen-close" onClick={onClose} aria-label="Fermer Lumen">
                            <X size={17} />
                        </button>
                    </div>
                </header>
                <div className="vibefx-lumen-frame">
                    <iframe
                        ref={iframeRef}
                        title="Lumen shader studio"
                        src={LUMEN_EMBED_SRC}
                        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-modals"
                    />
                </div>
            </section>
        </div>
    );
}
