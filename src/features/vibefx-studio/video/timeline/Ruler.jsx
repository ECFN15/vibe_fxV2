import React from 'react';
import useVideoStore from '../store/videoStore';

const Ruler = ({ scrollX, pps, totalDuration, contentWidth }) => {
    const { seekTo, currentTime } = useVideoStore();

    let interval = 1;
    if (pps < 15)       interval = 30;
    else if (pps < 30)  interval = 10;
    else if (pps < 60)  interval = 5;
    else if (pps < 120) interval = 2;
    else if (pps > 250) interval = 0.5;

    const markCount = Math.ceil((totalDuration + interval) / interval) + 1;

    const handleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollX;
        seekTo(Math.max(0, Math.min(totalDuration, x / pps)));
    };

    const formatLabel = (secs) => {
        const s = Math.round(secs * 10) / 10;
        if (s < 60) {
            if (interval < 1) {
                const whole = Math.floor(s);
                const dec = Math.round((s - whole) * 10);
                return `0:${String(whole).padStart(2, '0')}.${dec}`;
            }
            return `0:${String(Math.round(s)).padStart(2, '0')}`;
        }
        const m = Math.floor(s / 60);
        const rem = Math.round(s % 60);
        return `${m}:${String(rem).padStart(2, '0')}`;
    };

    return (
        <div
            className="h-full bg-neutral-950 relative cursor-pointer select-none overflow-hidden"
            onClick={handleClick}
        >
            <div
                className="absolute top-0 left-0 h-full"
                style={{ width: `${contentWidth}px`, transform: `translate3d(-${scrollX}px, 0, 0)` }}
            >
                {Array.from({ length: markCount }, (_, i) => {
                    const time = i * interval;
                    const x = time * pps;

                    return (
                        <div key={i} className="absolute top-0 h-full" style={{ left: `${x}px` }}>
                            <div className="w-px h-3 bg-neutral-700" />
                            <span className="absolute top-3 left-1 text-[8px] font-mono text-neutral-500 whitespace-nowrap tabular-nums select-none">
                                {formatLabel(time)}
                            </span>
                            {interval >= 1 && Array.from({ length: 4 }, (_, j) => (
                                <div
                                    key={j}
                                    className="absolute top-0 w-px h-1.5 bg-neutral-800"
                                    style={{ left: `${(j + 1) * (pps * interval / 5)}px` }}
                                />
                            ))}
                        </div>
                    );
                })}

                {/* Playhead indicator on ruler */}
                <div
                    className="absolute top-0 h-full w-px bg-indigo-500 pointer-events-none"
                    style={{ left: `${currentTime * pps}px` }}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0
                        border-l-[4px] border-l-transparent
                        border-r-[4px] border-r-transparent
                        border-t-[5px] border-t-indigo-500"
                    />
                </div>
            </div>
        </div>
    );
};

export default Ruler;
