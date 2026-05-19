import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Rewind, Volume2, VolumeX, Radio } from 'lucide-react';
import { Howl, Howler } from 'howler';

const PLAYLIST = [
    { title: "Akira", file: "/music/Karl Casey - Akira.mp3" },
    { title: "Andromeda", file: "/music/Karl Casey - Andromeda.mp3" },
    { title: "Black Tar", file: "/music/Karl Casey - Black Tar.mp3" },
    { title: "Blade Runner", file: "/music/Karl Casey - Blade Runner.mp3" },
    { title: "Chrome", file: "/music/Karl Casey - Chrome.mp3" },
    { title: "Cyberpunk", file: "/music/Karl Casey - Cyberpunk.mp3" },
    { title: "Empty Streets", file: "/music/Karl Casey - Empty Streets.mp3" },
    { title: "Future City", file: "/music/Karl Casey - Future City.mp3" },
    { title: "Ghost in the Shell", file: "/music/Karl Casey - Ghost in the Shell.mp3" },
    { title: "Hackers", file: "/music/Karl Casey - Hackers.mp3" },
    { title: "Neon City", file: "/music/Karl Casey - Neon City.mp3" },
    { title: "Neuromancer", file: "/music/Karl Casey - Neuromancer.mp3" },
    { title: "Night Drive", file: "/music/Karl Casey - Night Drive.mp3" },
    { title: "Overdrive", file: "/music/Karl Casey - Overdrive.mp3" },
    { title: "System Failure", file: "/music/Karl Casey - System Failure.mp3" },
    { title: "Tokyo Rain", file: "/music/Karl Casey - Tokyo Rain.mp3" },
    { title: "Virtual Reality", file: "/music/Karl Casey - Virtual Reality.mp3" },
    { title: "Artificial Intelligence", file: "/music/Karl Casey - Artificial Intelligence.mp3" },
    { title: "Dark Matter", file: "/music/Karl Casey - Dark Matter.mp3" },
    { title: "Exosuit", file: "/music/Karl Casey - Exosuit.mp3" },
    { title: "Neon Blood", file: "/music/Karl Casey - Neon Blood.mp3" },
    { title: "Replicant", file: "/music/Karl Casey - Replicant.mp3" },
    { title: "The Grid", file: "/music/Karl Casey - The Grid.mp3" }
];

const MusicPlayer = ({ isDarkMode }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(false);

    const hoverTimeoutRef = useRef(null);
    const isDraggingRef = useRef(false);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setShowControls(true);
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            if (!isDraggingRef.current) {
                setShowControls(false);
            }
        }, 600); // 600ms grace period to allow mouse crossing transparent gaps
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const soundRef = useRef(null);

    // Load and play track
    useEffect(() => {
        if (soundRef.current) {
            soundRef.current.unload();
        }

        const track = PLAYLIST[currentTrackIndex];
        soundRef.current = new Howl({
            src: [track.file],
            html5: true, // Force HTML5 audio for larger files
            volume: isMuted ? 0 : volume,
            onend: () => {
                handleNext();
            }
        });

        if (isPlaying) {
            soundRef.current.play();
        }

        return () => {
            if (soundRef.current) {
                soundRef.current.unload();
            }
        };
    }, [currentTrackIndex]);

    // Handle Volume
    useEffect(() => {
        if (soundRef.current) {
            soundRef.current.volume(isMuted ? 0 : volume);
        }
    }, [volume, isMuted]);

    const togglePlay = () => {
        if (!soundRef.current) return;

        if (isPlaying) {
            soundRef.current.pause();
        } else {
            soundRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleNext = () => {
        const nextIndex = (currentTrackIndex + 1) % PLAYLIST.length;
        setCurrentTrackIndex(nextIndex);
        if (!isPlaying) setIsPlaying(true);
    };

    const handlePrev = () => {
        const prevIndex = currentTrackIndex === 0 ? PLAYLIST.length - 1 : currentTrackIndex - 1;
        setCurrentTrackIndex(prevIndex);
        if (!isPlaying) setIsPlaying(true);
    };

    const currentTrack = PLAYLIST[currentTrackIndex];

    return (
        <div
            className={`relative flex items-center h-full px-4 border-l transition-colors duration-300 ${isDarkMode ? 'border-neutral-800' : 'border-gray-200'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Visualizer & Track Info (Always Visible) */}
            <div className="flex items-center gap-3 cursor-pointer w-48 sm:w-64" onClick={togglePlay}>

                {/* Animated Custom EQ */}
                <div className={`flex items-end gap-[2px] h-4 w-12 shrink-0 ${isDarkMode ? 'opacity-80' : 'opacity-60'}`}>
                    {[1.2, 0.8, 1.5, 1.1, 0.9, 1.3, 0.7, 1.4].map((duration, i) => (
                        <div
                            key={i}
                            className={`w-1 origin-bottom transition-colors duration-300`}
                            style={{
                                height: '100%',
                                backgroundColor: isPlaying && !isMuted ? '#6366f1' : (isDarkMode ? '#525252' : '#9ca3af'),
                                boxShadow: isPlaying && !isMuted ? '0 0 8px rgba(99,102,241,0.6)' : 'none',
                                transform: isPlaying && !isMuted ? 'scaleY(0.2)' : 'scaleY(0.2)',
                                animation: isPlaying && !isMuted ? `eq ${duration}s infinite ease-in-out` : 'none',
                            }}
                        />
                    ))}
                </div>

                {/* Track info marquee */}
                <div className="flex-1 overflow-hidden relative group">
                    <div className={`text-[9px] uppercase font-mono whitespace-nowrap ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        <span
                            key={isPlaying ? 'playing' : 'standby'}
                            className={`inline-block ${isPlaying ? 'animate-[scroll_5s_linear_infinite]' : (isDarkMode ? 'text-neutral-500' : 'text-gray-500')}`}
                        >
                            {isPlaying ? `${currentTrack.title} *** Karl Casey *** ${currentTrack.title}` : 'SYSTEM_STANDBY'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Hover Controls Panel */}
            <div className={`absolute top-14 -left-[1px] w-[calc(100%+1px)] px-4 py-4 backdrop-blur-xl border border-t-0 shadow-2xl transition-all duration-300 origin-top transform ${showControls ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'} ${isDarkMode ? 'bg-black/95 border-neutral-800' : 'bg-white/95 border-gray-200'}`}>

                <div className="flex flex-col gap-3">
                    {/* Header / Vibe */}
                    <div className={`flex items-center justify-between border-b pb-2 ${isDarkMode ? 'border-neutral-800' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                            <Radio size={12} className={isPlaying ? 'text-indigo-500 animate-pulse' : 'text-neutral-500'} />
                            <span className={`text-[10px] uppercase font-mono tracking-widest ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`}>Vibe_Radio</span>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-500">FM.84</span>
                    </div>

                    {/* Now Playing Title */}
                    <div className="text-center">
                        <h3 className={`font-mono text-xs uppercase tracking-wider truncate px-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>{currentTrack.title}</h3>
                        <p className={`font-mono text-[9px] uppercase tracking-widest mt-1 ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Karl Casey</p>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex items-center justify-center gap-4 py-2">
                        <button onClick={handlePrev} className={`hover:scale-110 transition-transform ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                            <Rewind size={16} />
                        </button>
                        <div
                            onClick={togglePlay}
                            className={`w-10 h-10 flex items-center justify-center cursor-pointer transition-all clip-path-polygon ${isPlaying ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : (isDarkMode ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')}`}
                        >
                            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-1" />}
                        </div>
                        <button onClick={handleNext} className={`hover:scale-110 transition-transform ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                            <FastForward size={16} />
                        </button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsMuted(!isMuted)} className={isDarkMode ? 'text-neutral-400' : 'text-gray-500'}>
                            {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onMouseDown={() => { isDraggingRef.current = true; }}
                            onChange={(e) => {
                                setVolume(parseFloat(e.target.value));
                                if (isMuted) setIsMuted(false);
                            }}
                            className="slider"
                        />
                    </div>

                </div>

            </div>

        </div>
    );
};

export default MusicPlayer;
