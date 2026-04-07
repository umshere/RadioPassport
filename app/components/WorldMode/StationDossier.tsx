import React, { useState } from 'react';
import { Station } from '~/types/radio';
import { StationContext } from '~/types/world';
import { Badge, Divider, Card, Skeleton, Text, ActionIcon, Tooltip, Group } from '@mantine/core';
import {
    IconBroadcast,
    IconCalendar,
    IconMap2,
    IconMusic,
    IconWorld,
    IconSparkles,
    IconUser,
    IconDisc,
    IconBrandYoutube,
    IconBrandWikipedia,
    IconExternalLink,
    IconMicroscope,
    IconRobot
} from '@tabler/icons-react';
import { useNowPlayingMetadata } from '~/hooks/useNowPlayingMetadata';
import { useTrackTrivia } from '~/hooks/useTrackTrivia';
import { usePlayerStore } from '~/state/playerStore';

interface StationDossierProps {
    station: Station;
    context: StationContext | null;
    loading: boolean;
    onRecommendationClick: (station: any) => void;
}

const renderLinkIcon = (kind?: string) => {
    switch (kind) {
        case "youtube": return IconBrandYoutube;
        case "artist": return IconUser;
        case "release": return IconDisc;
        case "track": return IconMusic;
        case "info": return IconBrandWikipedia;
        default: return IconExternalLink;
    }
};

export function StationDossier({ station, context, loading, onRecommendationClick }: StationDossierProps) {
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const nowPlayingMeta = useNowPlayingMetadata(station, isPlaying);
    const [aiExpanded, setAiExpanded] = useState(false);

    const freeTrivia = useTrackTrivia({
        track: nowPlayingMeta.track,
        source: "free",
        enabled: true,
    });

    const aiTrivia = useTrackTrivia({
        track: nowPlayingMeta.track,
        source: "ai",
        enabled: aiExpanded,
        context: {
            summary: freeTrivia.trivia?.summary ?? null,
            facts: freeTrivia.trivia?.facts ?? [],
        },
    });

    const trivia = freeTrivia.trivia;
    const hasTrack = nowPlayingMeta.status === "ready" && nowPlayingMeta.track;
    const trackImage = trivia?.imageUrl;

    return (
        <Card shadow="lg" radius="xl" p={{ base: 'md', sm: 'lg', md: 'xl' }} className="h-full bg-[var(--rp-card)] border border-white/10 backdrop-blur-3xl text-[var(--rp-text)] overflow-y-auto custom-scrollbar relative">
            {/* Terminal Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-30 bg-[length:100%_2px,3px_100%]" />

            {/* Header / Identity */}
            <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-1 w-1 rounded-full bg-[var(--rp-gold)] animate-pulse" />
                        <Text c="var(--rp-gold)" size="xs" fw={800} tt="uppercase" style={{ letterSpacing: '0.2em' }} className="font-mono">
                            Terminal 01 // {context?.regionalCoordinates || 'LOCATING...'}
                        </Text>
                    </div>
                    {loading ? (
                        <Skeleton height={28} width="80%" radius="xs" bg="white/5" mb="xs" />
                    ) : (
                        <Text c="var(--rp-text)" size="xl" fw={900} className="leading-tight mb-3 font-mono uppercase tracking-tighter text-2xl truncate">
                            {context?.deepDive?.subject || station.name}
                        </Text>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" color="yellow" size="sm" radius="xs" className="font-mono text-[10px] tracking-widest bg-[rgba(245,177,45,0.12)] border-[rgba(245,177,45,0.4)] px-2 py-3 text-[var(--rp-gold)]">
                            {context?.musicalVibe?.split(' ')[0] || 'LIVE'}
                        </Badge>
                        <Badge variant="filled" color="dark" size="sm" radius="xs" className="font-mono text-[10px] tracking-widest border border-white/10 px-2 py-3 text-[var(--rp-text)] bg-black/40">
                            {context?.currentProgram || 'STREAM'}
                        </Badge>
                    </div>
                </div>
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group shrink-0 ml-4 p-1 bg-black/40">
                    <div className="w-full h-full rounded-xl overflow-hidden relative">
                        {station.favicon ? (
                            <img src={station.favicon} alt={station.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(event) => {
                                event.currentTarget.style.display = 'none';
                            }} />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#12141d] to-black flex items-center justify-center">
                                <IconBroadcast size={28} className="text-white/20" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>
                </div>
            </div>

            <Divider color="white" opacity={0.08} my="xl" />

            {/* Sonic Spotlight - Current Transmission Logic */}
            {hasTrack ? (
                <div className="mb-10 animate-fade-in relative z-10">
                    <div className="flex items-center justify-between mb-5">
                        <Group gap={8}>
                            <IconSparkles size={16} className="text-[var(--rp-gold)]" />
                            <Text c="var(--rp-text)" size="xs" fw={900} tt="uppercase" style={{ letterSpacing: '0.2em' }} className="font-mono">
                                Sonic Spotlight
                            </Text>
                        </Group>
                        <Tooltip label={aiExpanded ? "Hide Deep Analysis" : "Deep Scan Track"} position="left">
                            <ActionIcon
                                variant="gradient"
                                gradient={aiExpanded ? { from: 'yellow', to: 'orange' } : { from: 'gray', to: 'dark' }}
                                size="md"
                                radius="md"
                                onClick={() => setAiExpanded(!aiExpanded)}
                                className="shadow-lg"
                            >
                                <IconMicroscope size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </div>

                    <div className="relative group">
                        {/* Artwork Frame */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-black/40 to-black/20 border border-white/10 backdrop-blur-md relative overflow-hidden group-hover:bg-black/60 transition-colors">
                            <div className="w-full sm:w-32 h-32 rounded-xl overflow-hidden shrink-0 border border-white/20 shadow-2xl relative">
                                {trackImage ? (
                                    <img src={trackImage} alt="Analysis" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[#12141d] to-black flex items-center justify-center">
                                        <IconMusic size={40} className="text-white/10" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                {/* Corner Accents */}
                                <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-[rgba(245,177,45,0.5)]" />
                                <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-[rgba(245,177,45,0.5)]" />
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <Text c="var(--rp-text)" fw={900} size="lg" className="leading-tight font-mono tracking-tight mb-1">
                                    {nowPlayingMeta.track?.title}
                                </Text>
                                <Text c="var(--rp-gold)" fw={800} size="sm" className="mb-3 font-mono uppercase tracking-widest opacity-80">
                                    {nowPlayingMeta.track?.artist}
                                </Text>

                                {trivia?.facts && trivia.facts.length > 0 ? (
                                    <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                        {trivia.facts.map((fact, i) => (
                                            <div key={i} className="rounded-xl border border-white/10 bg-black/40 px-2 sm:px-3 py-2">
                                                <span className="text-[8px] sm:text-[9px] uppercase text-white/40 font-black tracking-[0.12em] sm:tracking-[0.18em]">
                                                    {fact.label}
                                                </span>
                                                <span className="mt-1 block text-[10px] sm:text-xs text-[var(--rp-text)] font-mono font-bold truncate">
                                                    {fact.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Text size="xs" c="var(--rp-muted-2)" className="font-mono uppercase tracking-[0.2em] opacity-60">
                                        Signal fragments pending
                                    </Text>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Meta-Summary */}
                    {trivia?.summary && (
                        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[rgba(245,177,45,0.12)] to-black/20 border border-white/10 border-l-[rgba(245,177,45,0.5)]">
                            <Text size="xs" c="var(--rp-text)" style={{ lineHeight: 1.6 }} className="font-serif italic opacity-90">
                                "{trivia.summary}"
                            </Text>
                        </div>
                    )}

                    {/* AI Analysis View */}
                    {aiExpanded && (
                        <div className="mt-4 p-5 rounded-2xl bg-[rgba(245,177,45,0.08)] border border-[rgba(245,177,45,0.2)] animate-fade-in shadow-2xl">
                            <Group justify="space-between" mb="md">
                                <Text c="var(--rp-gold)" size="xs" fw={900} tt="uppercase" className="font-mono flex items-center gap-2">
                                    <IconRobot size={16} /> Signal Decryption
                                </Text>
                                <Badge color="yellow" variant="dot" size="xs" className="font-mono">ENCRYPTED</Badge>
                            </Group>

                            {aiTrivia.status === 'loading' ? (
                                <div className="space-y-3">
                                    <Skeleton height={12} radius="xs" className="opacity-20" />
                                    <Skeleton height={12} radius="xs" width="80%" className="opacity-20" />
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <Skeleton height={40} radius="xs" className="opacity-10" />
                                        <Skeleton height={40} radius="xs" className="opacity-10" />
                                    </div>
                                </div>
                            ) : aiTrivia.trivia ? (
                                <div className="space-y-4">
                                    <Text size="xs" c="var(--rp-text)" className="leading-relaxed font-mono opacity-80">
                                        {aiTrivia.trivia.summary}
                                    </Text>
                                    <div className="grid grid-cols-2 gap-3">
                                        {aiTrivia.trivia.facts.map((f, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-black/50 border border-white/10">
                                                <Text size="8" c="var(--rp-gold)" tt="uppercase" fw={900} className="mb-1 font-mono text-[9px]">{f.label}</Text>
                                                <Text size="xs" c="var(--rp-text)" fw={700} className="font-mono">{f.value}</Text>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 border border-dashed border-red-500/30 rounded-lg text-center">
                                    <Text size="xs" c="red.3" fw={700} className="font-mono">DECRYPTION FAILED // SIGNAL INTERRUPTED</Text>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Signal Links */}
                    {trivia?.links && trivia.links.length > 0 && (
                        <div className="flex gap-3 mt-5">
                            {trivia.links.map((link, i) => {
                                const Icon = renderLinkIcon(link.kind);
                                return (
                                    <ActionIcon
                                        key={i}
                                        component="a"
                                        href={link.url}
                                        target="_blank"
                                        variant="outline"
                                        color="gray"
                                        size="lg"
                                        radius="md"
                                        className="hover:bg-black/60 hover:border-white/30 border-white/10"
                                    >
                                        <Icon size={18} />
                                    </ActionIcon>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* Still loading track ID or no track playing */
                <div className="mb-10 p-8 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center bg-black/30">
                    {nowPlayingMeta.status === 'loading' ? (
                        <>
                            <div className="relative mb-3">
                                <IconBroadcast size={32} className="text-[var(--rp-gold)]/60 animate-pulse" />
                                <div className="absolute inset-0 animate-ping opacity-20"><IconBroadcast size={32} className="text-[var(--rp-gold)]" /></div>
                            </div>
                            <Text size="xs" fw={900} tt="uppercase" c="var(--rp-text)" className="font-mono opacity-60 tracking-widest">Identifying Signal...</Text>
                        </>
                    ) : (
                        <>
                            <IconMusic size={32} className="mb-3 text-white/10" />
                            <Text size="xs" fw={900} tt="uppercase" c="var(--rp-text)" className="font-mono opacity-40 tracking-widest">Awaiting Sonic ID...</Text>
                        </>
                    )}
                </div>
            )}

            {/* AI Context Sections - Independent from Track ID */}
            <div className={`space-y-10 transition-all duration-700 ${loading ? 'opacity-40 blur-[1px]' : 'opacity-100 blur-0'}`}>
                {/* Flight Log */}
                <div className="relative z-10">
                    <Text c="var(--rp-gold)" size="xs" fw={900} tt="uppercase" mb="sm" style={{ letterSpacing: '0.2em' }} className="flex items-center gap-2 font-mono">
                        <IconMap2 size={14} /> Mission Log
                    </Text>
                    <div className="p-5 rounded-2xl bg-black/30 border-l-2 border-[rgba(245,177,45,0.5)] group">
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton height={12} radius="xs" bg="white/5" />
                                <Skeleton height={12} radius="xs" width="60%" bg="white/5" />
                            </div>
                        ) : (
                            <Text c="var(--rp-text)" size="sm" style={{ lineHeight: 1.8 }} className="italic font-serif opacity-80">
                                "{context?.flightLog || 'Analyzing signal origins...'}"
                            </Text>
                        )}
                    </div>
                </div>

                {/* Intel Dossier Sections */}
                <div className="space-y-8 relative z-10">
                    <div className="p-6 rounded-2xl bg-black/30 border border-white/10 hover:border-white/20 transition-colors group">
                        <Text c="var(--rp-text)" size="xs" fw={900} tt="uppercase" mb="sm" style={{ letterSpacing: '0.15em' }} className="font-mono opacity-50">
                            Origin Intel
                        </Text>
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton height={12} radius="xs" bg="white/5" />
                                <Skeleton height={12} radius="xs" bg="white/5" />
                                <Skeleton height={12} radius="xs" width="80%" bg="white/5" />
                            </div>
                        ) : (
                            <Text c="var(--rp-muted)" size="sm" style={{ lineHeight: 1.8 }} className="font-mono">
                                {context?.deepDive?.bio}
                            </Text>
                        )}
                    </div>

                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[rgba(245,177,45,0.08)] to-black/30 border border-[rgba(245,177,45,0.2)]">
                        <Text c="var(--rp-gold)" size="xs" fw={900} tt="uppercase" mb="sm" style={{ letterSpacing: '0.15em' }} className="flex items-center gap-2 font-mono">
                            <IconMusic size={14} /> Sonic DNA
                        </Text>
                        {loading ? (
                            <Skeleton height={16} radius="xs" bg="white/5" />
                        ) : (
                            <Text c="var(--rp-text)" size="sm" fw={500} style={{ lineHeight: 1.8 }} className="font-mono">
                                {context?.deepDive?.genreOrigins}
                            </Text>
                        )}
                    </div>
                </div>

                <Divider color="white" opacity={0.08} my="xl" />

                {/* Transmissions Schedule */}
                <div className="mb-8 relative z-10">
                    <Text c="var(--rp-text)" size="xs" fw={900} tt="uppercase" mb="lg" style={{ letterSpacing: '0.2em' }} className="flex items-center gap-2 font-mono opacity-50">
                        <IconCalendar size={14} /> Transmissions
                    </Text>
                    <div className="space-y-2">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} height={40} radius="xl" bg="white/5" mb="xs" />
                            ))
                        ) : (
                            context?.liveSchedule?.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 text-xs group cursor-default p-3 rounded-xl hover:bg-black/40 border border-transparent hover:border-white/10 transition-all">
                                    <span className="font-mono font-black text-[var(--rp-gold)]/60 group-hover:text-[var(--rp-gold)]">{(idx + 1).toString().padStart(2, '0')}</span>
                                    <span className="font-mono text-[var(--rp-muted)] group-hover:text-[var(--rp-text)] transition-colors">{item}</span>
                                    <div className="flex-1 border-b border-dashed border-white/10 opacity-0 group-hover:opacity-100 mx-2" />
                                    <Badge variant="dot" color="yellow" size="xs" className="opacity-0 group-hover:opacity-100 font-mono">LIVE</Badge>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
