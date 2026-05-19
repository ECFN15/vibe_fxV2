import React, { useState, useEffect, useRef, useCallback } from 'react';
import AssetSidebar from './AssetSidebar';
import AssetGrid from './AssetGrid';
import ScrapingStatus from './ScrapingStatus';
import AssetModal from './AssetModal';
import ReclassifyReportModal from './ReclassifyReportModal';
import { Loader2 } from 'lucide-react';

const PAGE_SIZE = 200;

export default function AssetLibrary({ isDarkMode, onUseAsset, isPickerMode }) {
    const [themesData, setThemesData] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [status, setStatus] = useState(null);
    const [reclassifyStatus, setReclassifyStatus] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // UI state
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);

    const statusRef = useRef(status);
    statusRef.current = status;

    // ── Fetch helpers ───────────────────────────────────────
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchThemes = useCallback(async () => {
        try {
            const res = await fetch('/api/themes');
            const data = await res.json();
            setThemesData(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchCatalog = useCallback(async (page = 1, theme = null, append = false) => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: PAGE_SIZE.toString(),
            });
            if (theme) params.set('theme', theme);

            const res = await fetch(`/api/catalog?${params}`);
            if (!res.ok) throw new Error("HTTP error " + res.status);
            const data = await res.json();

            if (data.items && Array.isArray(data.items)) {
                if (append) {
                    setCatalog(prev => [...prev, ...data.items]);
                } else {
                    setCatalog(data.items);
                }
                setCurrentPage(data.page);
                setTotalPages(data.totalPages);
                setTotalItems(data.total);
            }
        } catch (e) {
            console.error('Fetch catalog failed:', e);
        }
    }, []);

    // ── Load more (infinite scroll / button) ────────────────
    const loadMore = useCallback(async () => {
        if (currentPage >= totalPages || isLoadingMore) return;
        setIsLoadingMore(true);
        await fetchCatalog(currentPage + 1, selectedTheme, true);
        setIsLoadingMore(false);
    }, [currentPage, totalPages, isLoadingMore, selectedTheme, fetchCatalog]);

    // ── Reset page when theme changes ───────────────────────
    const handleSelectTheme = useCallback((theme) => {
        setSelectedTheme(theme);
        setCatalog([]);
        setCurrentPage(1);
        fetchCatalog(1, theme);
    }, [fetchCatalog]);

    // ── Initial load ────────────────────────────────────────
    useEffect(() => {
        fetchThemes();
        fetchCatalog(1, null);
        fetchStatus();
    }, []);

    // ── Polling during scraping ─────────────────────────────
    const prevStatusRef = useRef(null);

    useEffect(() => {
        let statusInterval;
        let catalogInterval;
        let finalRefreshTimers = [];

        const wasRunning = prevStatusRef.current === 'running';
        const nowDone = status?.status === 'done' || status?.status === 'error';
        const isRunning = status?.status === 'running';

        if (isRunning) {
            // Poll status every 2s, catalog every 3s
            statusInterval = setInterval(fetchStatus, 2000);
            catalogInterval = setInterval(() => {
                fetchCatalog(1, selectedTheme);
                fetchThemes();
            }, 3000);
        }

        if (wasRunning && nowDone) {
            fetchCatalog(1, selectedTheme);
            fetchThemes();
            finalRefreshTimers.push(
                setTimeout(() => { fetchCatalog(1, selectedTheme); fetchThemes(); }, 1000),
                setTimeout(() => { fetchCatalog(1, selectedTheme); fetchThemes(); }, 3000),
            );
        }

        // Auto-dismiss the status popup after 5s when done/error
        if (nowDone) {
            finalRefreshTimers.push(
                setTimeout(() => {
                    fetchCatalog(1, selectedTheme);
                    fetchThemes();
                    setStatus(null);
                }, 5000)
            );
        }

        prevStatusRef.current = status?.status;

        return () => {
            clearInterval(statusInterval);
            clearInterval(catalogInterval);
            finalRefreshTimers.forEach(t => clearTimeout(t));
        };
    }, [status?.status]);

    // ── Scrape handler ──────────────────────────────────────
    const handleScrape = async (config) => {
        try {
            const res = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                setStatus({ status: 'running', phase: 'starting', progress: 0, found: 0, matched: 0, downloaded: 0, errors: 0, message: 'Starting...' });
                setTimeout(fetchStatus, 1000);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // ── Reset all ───────────────────────────────────────────
    const handleReset = async () => {
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            if (res.ok) {
                setCatalog([]);
                setThemesData(null);
                setSelectedTheme(null);
                setCurrentPage(1);
                setTotalPages(1);
                setTotalItems(0);
                setTimeout(() => { fetchThemes(); fetchCatalog(1, null); }, 500);
            }
        } catch (e) {
            console.error('Reset failed:', e);
        }
    };

    // ── Reclassify handler ───────────────────────────────────
    const handleReclassify = async () => {
        try {
            const res = await fetch('/api/reclassify', { method: 'POST' });
            if (res.ok) {
                setReclassifyStatus({ status: 'running', progress: 0, total: 0, changed: 0, message: 'Starting...', changes: [] });
                // Start polling
                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await fetch('/api/reclassify/status');
                        const data = await statusRes.json();
                        setReclassifyStatus(data);
                        if (data.status === 'done' || data.status === 'error') {
                            clearInterval(pollInterval);
                            // Refresh data
                            fetchThemes();
                            fetchCatalog(1, selectedTheme);
                            // We do NOT auto-reset the UI status. The user will click "Close" in the modal.
                        }
                    } catch (e) {
                        console.error('Reclassify poll error:', e);
                    }
                }, 1000);
            }
        } catch (e) {
            console.error('Reclassify failed:', e);
        }
    };

    const handleNavigateLightbox = (direction) => {
        if (!lightboxImage) return;
        const idx = catalog.findIndex(img => img.jobId === lightboxImage.jobId);
        if (idx === -1) return;
        let newIdx = idx + direction;
        if (newIdx < 0) newIdx = catalog.length - 1;
        if (newIdx >= catalog.length) newIdx = 0;
        setLightboxImage(catalog[newIdx]);
    };

    return (
        <div className="flex h-full w-full overflow-hidden relative">
            {/* SIDEBAR */}
            <div className={`w-80 shrink-0 border-r flex flex-col ${isDarkMode ? 'border-neutral-800 bg-[#0a0a0a]' : 'border-gray-200 bg-white'}`}>
                {themesData ? (
                    <AssetSidebar
                        isDarkMode={isDarkMode}
                        categories={themesData.categories}
                        selectedTheme={selectedTheme}
                        totalImages={themesData.totalImages}
                        onSelectTheme={handleSelectTheme}
                        onScrape={handleScrape}
                        onReset={handleReset}
                        isScraping={status?.status === 'running'}
                        onReclassify={handleReclassify}
                        reclassifyStatus={reclassifyStatus}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="animate-spin text-neutral-500" size={24} />
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-[#050505]' : 'bg-gray-50'}`}>
                {/* TOOLBAR */}
                <div className={`sticky top-0 z-20 px-6 py-3 flex items-center justify-between border-b ${isDarkMode ? 'bg-[#050505]/80 border-neutral-800 backdrop-blur-md' : 'bg-white/80 border-gray-200 backdrop-blur-md'}`}>
                    <div className="flex items-center gap-6">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold">
                            Explorateur de Bibliothèque
                        </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest">
                        <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
                            <strong className="text-indigo-400 font-bold">{themesData?.totalImages || 0}</strong>{' '}Images en bibliothèque
                        </span>
                        <div className="w-1 h-1 rounded-full bg-neutral-700"></div>
                        <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
                            <strong className="text-indigo-400 font-bold">{totalItems}</strong>{' '}Résultats
                        </span>
                        {totalPages > 1 && (
                            <>
                                <div className="w-1 h-1 rounded-full bg-neutral-700"></div>
                                <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
                                    Page <strong className="text-indigo-400 font-bold">{currentPage}</strong>/{totalPages}
                                </span>
                            </>
                        )}
                    </div>
                </div>


                <div className="max-w-[1920px] mx-auto p-6">
                    <AssetGrid
                        isDarkMode={isDarkMode}
                        images={catalog}
                        selectedTheme={selectedTheme}
                        themesData={themesData}
                        onUseAsset={onUseAsset}
                        onOpenLightbox={setLightboxImage}
                        onScrape={handleScrape}
                        onDelete={async (jobId) => {
                            try {
                                const res = await fetch(`/api/catalog/${jobId}`, { method: 'DELETE' });
                                if (res.ok) {
                                    setCatalog(prev => prev.filter(img => img.jobId !== jobId));
                                    setTotalItems(prev => prev - 1);
                                    fetchThemes();
                                }
                            } catch (e) {
                                console.error('Delete failed:', e);
                            }
                        }}
                        isPickerMode={isPickerMode}
                    />

                    {/* LOAD MORE BUTTON */}
                    {currentPage < totalPages && catalog.length > 0 && (
                        <div className="flex justify-center mt-8 mb-4">
                            <button
                                onClick={loadMore}
                                disabled={isLoadingMore}
                                className={`px-8 py-3 font-mono text-[10px] uppercase tracking-widest font-bold border transition-all duration-300 ${isDarkMode
                                    ? 'border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white hover:border-indigo-500/50'
                                    : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 hover:border-indigo-400'
                                    } ${isLoadingMore ? 'opacity-50 cursor-wait' : 'hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] active:scale-95'}`}
                            >
                                {isLoadingMore ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={14} />
                                        Chargement...
                                    </span>
                                ) : (
                                    `Charger plus (${catalog.length}/${totalItems})`
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* STATUS BAR */}
            {(status?.status === 'running' || status?.status === 'done' || status?.status === 'error') && (
                <ScrapingStatus status={status} isDarkMode={isDarkMode} />
            )}

            {/* LIGHTBOX MODAL */}
            {lightboxImage && (
                <AssetModal
                    isDarkMode={isDarkMode}
                    image={lightboxImage}
                    themesData={themesData}
                    onClose={() => setLightboxImage(null)}
                    onNavigate={handleNavigateLightbox}
                    onUseAsset={onUseAsset}
                    isPickerMode={isPickerMode}
                />
            )}

            {/* RECLASSIFY REPORT MODAL */}
            {reclassifyStatus?.status === 'done' && (
                <ReclassifyReportModal
                    isDarkMode={isDarkMode}
                    status={reclassifyStatus}
                    onClose={async () => {
                        try {
                            await fetch('/api/reclassify/reset', { method: 'POST' });
                        } catch (e) {
                            console.error(e);
                        }
                        setReclassifyStatus(null);
                    }}
                />
            )}
        </div>
    );
}
