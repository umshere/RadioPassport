import React, { useState, useMemo, useEffect } from 'react';
import type { Station } from '~/types/radio';
import { markArtworkUrlFailed, sanitizeArtworkUrl } from '~/utils/stations';

interface StationArtworkProps {
    station: Partial<Station>;
    className?: string;
    fallbackClassName?: string;
    alt?: string;
    fallbackStyle?: React.CSSProperties;
    loading?: "lazy" | "eager";
    decoding?: "async" | "sync" | "auto";
    sizes?: string;
}

export function StationArtwork({
    station,
    className = "w-full h-full object-cover",
    fallbackClassName = "w-full h-full flex items-center justify-center text-white font-bold",
    alt = "artwork",
    fallbackStyle,
    loading = "lazy",
    decoding = "async",
    sizes,
}: StationArtworkProps) {
    const [imgFailed, setImgFailed] = useState(false);

    // Reset failure state when station changes
    useEffect(() => {
        setImgFailed(false);
    }, [station.favicon, station.uuid]);

    const initials = useMemo(() => {
        const name = station.name || 'FM';
        const words = name.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2 && words[0]?.[0] && words[1]?.[0]) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }, [station.name]);

    const fallbackGradient = useMemo(() => {
        if (fallbackStyle?.background || fallbackStyle?.backgroundColor) return undefined;
        const name = station.name || 'FM';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const vibrantHues = [25, 35, 45, 280, 320, 350, 260];
        const h1 = vibrantHues[Math.abs(hash) % vibrantHues.length] ?? 35;
        const h2 = (h1 + 30) % 360;
        return `linear-gradient(135deg, hsl(${h1}, 85%, 60%) 0%, hsl(${h2}, 75%, 50%) 100%)`;
    }, [station.name, fallbackStyle]);

    const artworkUrl = sanitizeArtworkUrl(station.favicon);

    if (artworkUrl && !imgFailed) {
        return (
            <img
                src={artworkUrl}
                alt={alt}
                className={className}
                loading={loading}
                decoding={decoding}
                sizes={sizes}
                onError={() => {
                    markArtworkUrlFailed(artworkUrl);
                    setImgFailed(true);
                }}
            />
        );
    }

    return (
        <div
            className={fallbackClassName}
            style={{ background: fallbackGradient, ...fallbackStyle }}
        >
            {initials}
        </div>
    );
}
