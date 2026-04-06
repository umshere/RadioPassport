
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from "@remix-run/react";
import ReactCountryFlag from 'react-country-flag';
import type { QueueSession, Station } from '~/types/radio';
import { CuratedRow, StationContext, PassportEntry, CurationSegment } from '~/types/world';
import { geminiService } from '~/services/geminiService';
import { rbFetchJson } from '~/utils/radioBrowser';
import { normalizeStations } from '~/utils/stations';
import { createQueueSession } from '~/utils/playerQueue';

import { StationDossier } from './StationDossier';
import { PassportView } from './PassportView';
import { SonicFlightTracker } from './SonicFlightTracker';
// Assuming StationGrid is at specific path or we can use a simpler list if imports fail
// Let's use a simple path that is likely correct based on _index.tsx: ~/routes/components/StationGrid
import { StationGrid } from '~/routes/components/StationGrid';

import { IconSearch, IconSparkles, IconBroadcast, IconWorld, IconRobot, IconRadar, IconX, IconSatellite, IconMicroscope } from '@tabler/icons-react';
import { Loader, TextInput, Drawer, ActionIcon, Tooltip, Group, Text } from '@mantine/core';

interface WorldHomeProps {
    nowPlaying: Station | null;
    onPlayStation: (station: Station, queueSession?: QueueSession | null) => void;
    initialStations: Station[];
}

export function WorldHome({ nowPlaying, onPlayStation, initialStations }: WorldHomeProps) {
    // State
    const [curatedRows, setCuratedRows] = useState<CuratedRow[]>([]);
    const [searchResultStations, setSearchResultStations] = useState<Station[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentContext, setCurrentContext] = useState<StationContext | null>(null);
    const [isContextLoading, setIsContextLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'discover' | 'passport' | 'terminal'>('discover');
    const [searchParams, setSearchParams] = useSearchParams();
    const [terminalOpened, setTerminalOpened] = useState(false);
    const [passport, setPassport] = useState<PassportEntry[]>([]);
    const [aiPrompt, setAiPrompt] = useState('');
    const [agentMessage, setAgentMessage] = useState<string | null>(null);
    const [displayedAgentMessage, setDisplayedAgentMessage] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isTraveling, setIsTraveling] = useState(false);

    // Track last station for flight tracker
    const [lastStation, setLastStation] = useState<Station | null>(null);

    // Initialize Data
    useEffect(() => {
        // Set initial "Global Frequencies" row
        const initialRow: CuratedRow = {
            title: "Global Frequencies",
            description: "Top signals currently locked from around the planet.",
            stations: initialStations ? initialStations.slice(0, 12) : []
        };
        setCuratedRows([initialRow]);
        setLoading(false);

        // Load Passport
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('radio_passport');
            if (saved) {
                try {
                    setPassport(JSON.parse(saved));
                } catch (e) { console.error("Failed to parse passport", e); }
            }
        }

        // AI Curation (Lazy load)
        const loadAiCuration = async () => {
            try {
                const segments = await geminiService.generateCurationSegments();
                for (const seg of segments) {
                    try {
                        let url = `/json/stations/search?limit=6&hidebroken=true&order=clickcount&reverse=true`;
                        if (seg.query.tag) url += `&tag=${encodeURIComponent(seg.query.tag)}`;
                        if (seg.query.country) url += `&country=${encodeURIComponent(seg.query.country)}`;
                        if (seg.query.name) url += `&name=${encodeURIComponent(seg.query.name)}`;

                        const stationsRaw = await rbFetchJson<any>(url);
                        const stations = normalizeStations(Array.isArray(stationsRaw) ? stationsRaw : []);

                        if (stations.length > 0) {
                            setCuratedRows(prev => {
                                const others = prev.filter(r => r.title !== seg.title);
                                return [...others, { title: seg.title, description: seg.description, stations }];
                            });
                        }
                        await new Promise(r => setTimeout(r, 500));
                    } catch (e) {
                        console.warn(`Failed to fetch row: ${seg.title}`, e);
                    }
                }
            } catch (e) {
                console.warn("AI Curation failed", e);
            }
        };

        loadAiCuration();
    }, [initialStations]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (window.sessionStorage.getItem("focusSearch") === "1") {
            window.sessionStorage.removeItem("focusSearch");
            const searchInput = document.getElementById("hero-search-input") as HTMLInputElement | null;
            if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, []);

    // Track Station Changes
    const [trackedStationUuid, setTrackedStationUuid] = useState<string | null>(null);

    useEffect(() => {
        if (nowPlaying?.uuid !== trackedStationUuid) {
            if (trackedStationUuid !== null) {
                setIsTraveling(true);
                setTimeout(() => setIsTraveling(false), 2000);
            }
            setTrackedStationUuid(nowPlaying?.uuid || null);

            if (nowPlaying) {
                setIsContextLoading(true);
                setCurrentContext(null);
                geminiService.getStationContext(nowPlaying, lastStation?.country)
                    .then(ctx => setCurrentContext(ctx))
                    .catch(e => console.error(e))
                    .finally(() => setIsContextLoading(false));

                setPassport(prevPassport => {
                    if (prevPassport.find(p => p.id === nowPlaying.uuid)) return prevPassport;
                    const newEntry: PassportEntry = {
                        id: nowPlaying.uuid,
                        stationName: nowPlaying.name,
                        country: nowPlaying.country,
                        countryCode: (nowPlaying as any).countryCode || (nowPlaying as any).countrycode,
                        timestamp: Date.now(),
                        favicon: nowPlaying.favicon
                    };
                    const updated = [newEntry, ...prevPassport].slice(0, 50);
                    localStorage.setItem('radio_passport', JSON.stringify(updated));
                    return updated;
                });
            }
        }
    }, [nowPlaying, trackedStationUuid, lastStation]);

    const handlePlay = (station: Station, queueSession?: QueueSession | null) => {
        if (nowPlaying && nowPlaying.uuid !== station.uuid) {
            setLastStation(nowPlaying);
        }
        onPlayStation(station, queueSession);
    };

    const performAiSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!aiPrompt.trim()) return;

        setIsAiLoading(true);
        setAgentMessage(null);
        setDisplayedAgentMessage('Rerouting satellite uplink...');

        try {
            const action = await geminiService.processPrompt(aiPrompt);
            setAgentMessage(action.explanation);

            let url = `/json/stations/search?limit=24&hidebroken=true&order=clickcount&reverse=true`;
            if (action.query) url += `&name=${encodeURIComponent(action.query)}`;
            if (action.country) url += `&country=${encodeURIComponent(action.country)}`;
            if (action.tag) url += `&tag=${encodeURIComponent(action.tag)}`;

            const stationsRaw = await rbFetchJson<any>(url);
            const stations = normalizeStations(Array.isArray(stationsRaw) ? stationsRaw : []);

            setSearchResultStations(stations);
            setAiPrompt('');
            setTab('discover');

        } catch (e) {
            console.error("Search failed", e);
            setAgentMessage("Signal lost. Check your frequency band.");
            setSearchResultStations([]);
        } finally {
            setIsAiLoading(false);
        }
    };

    useEffect(() => {
        if (agentMessage) {
            setDisplayedAgentMessage('');
            let i = 0;
            const interval = setInterval(() => {
                setDisplayedAgentMessage(agentMessage.slice(0, i + 1));
                i++;
                if (i > agentMessage.length) clearInterval(interval);
            }, 20);
            return () => clearInterval(interval);
        }
    }, [agentMessage]);

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "passport" || tabParam === "discover") {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    const setTab = useCallback((tab: 'discover' | 'passport') => {
        setActiveTab(tab);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (tab === "discover") next.delete("tab");
            else next.set("tab", tab);
            return next;
        }, { preventScrollReset: true });
    }, [setSearchParams]);

    const clearSearch = () => {
        setSearchResultStations(null);
        setAgentMessage(null);
        setDisplayedAgentMessage('');
    };

    const featuredCountries = useMemo(() => {
        const list = searchResultStations || curatedRows.flatMap(r => r.stations);
        const counts: Record<string, { name: string, code: string, count: number }> = {};
        list.forEach(s => {
            // NOTE: Station type usually has `countrycode` (lowercase) or `countryCode`. 
            // Checking other files, `types/radio.ts` defines `countrycode`.
            // But `ReactCountryFlag` needs `countryCode`.
            // We'll access via `countrycode` as per lint error suggesting keys exist? 
            // Actually lint said "Property countrycode does not exist... Did you mean countryCode?". 
            // So I will use `countryCode`.
            // If runtime fails, map it.
            const code = (s as any).countryCode || (s as any).countrycode;
            if (!code) return;
            if (!counts[code]) {
                counts[code] = { name: s.country, code: code, count: 0 };
            }
            counts[code].count++;
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 8);
    }, [searchResultStations, curatedRows]);


    return (
        <div className="min-h-screen text-[var(--rp-text)]">
            <main className="max-w-7xl mx-auto px-4 py-6">
                <section className="mb-8 rounded-2xl border border-white/10 bg-[var(--rp-card)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 max-w-xl w-full md:w-auto">
                            <SonicFlightTracker
                                lastStation={lastStation}
                                currentStation={nowPlaying}
                                isTraveling={isTraveling}
                            />
                        </div>

                        <div className="flex bg-black/60 backdrop-blur-xl p-1 rounded-xl border border-white/10 shadow-2xl shrink-0">
                            <button
                                onClick={() => setTab('discover')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'discover' ? 'bg-white/10 text-[var(--rp-text)] shadow-inner' : 'text-[var(--rp-muted-2)] hover:text-[var(--rp-text)]'}`}
                            >
                                Discover
                            </button>
                            <button
                                onClick={() => setTab('passport')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'passport' ? 'bg-white/10 text-[var(--rp-text)] shadow-inner' : 'text-[var(--rp-muted-2)] hover:text-[var(--rp-text)]'}`}
                            >
                                Passport
                            </button>
                            {nowPlaying && (
                                <button
                                    onClick={() => setTerminalOpened(true)}
                                    className={`lg:hidden px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${terminalOpened ? 'bg-[rgba(245,177,45,0.2)] text-[var(--rp-gold)]' : 'text-[rgba(245,177,45,0.6)] hover:text-[var(--rp-gold)]'}`}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--rp-gold)] animate-pulse" />
                                    Terminal
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mb-10 max-w-2xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[rgba(245,177,45,0.25)] to-[rgba(245,177,45,0.1)] rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
                    <form onSubmit={performAiSearch} className="relative flex bg-[var(--rp-card)] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="pl-5 flex items-center text-[var(--rp-muted-2)]">
                            {isAiLoading ? <Loader size="xs" color="yellow" /> : <IconSparkles size={18} className="text-[var(--rp-gold)]/70" />}
                        </div>
                        <input
                            id="hero-search-input"
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Where to next? (e.g. 'Chill beats from Tokyo')"
                            className="w-full bg-transparent px-4 py-4 text-base focus:outline-none placeholder:text-[var(--rp-muted-2)] text-[var(--rp-text)]"
                        />
                        <button type="submit" disabled={isAiLoading || !aiPrompt.trim()} className="px-6 bg-[var(--rp-gold)] text-black font-bold text-xs uppercase tracking-widest hover:bg-[var(--rp-gold-strong)] transition-colors">
                            GO
                        </button>
                    </form>

                    {displayedAgentMessage && (
                        <div className="mt-3 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-[var(--rp-gold)] animate-fade-in flex items-start gap-3">
                            <IconRobot size={14} className="mt-0.5" />
                            <span className="leading-relaxed font-mono">{displayedAgentMessage}</span>
                        </div>
                    )}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 space-y-8">
                        {activeTab === 'discover' ? (
                            <>
                                {featuredCountries.length > 0 && (
                                    <div className="flex flex-wrap gap-2 animate-fade-in">
                                        {featuredCountries.map((c, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-black/40 border border-white/10 px-2.5 py-1 rounded-md border-dashed cursor-default hover:bg-black/60 transition-colors">
                                                <ReactCountryFlag countryCode={c.code} svg style={{ width: '12px', height: '9px' }} />
                                                <span className="text-[10px] font-bold text-[var(--rp-muted)] uppercase tracking-widest">{c.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {searchResultStations ? (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                            <h2 className="text-xl font-bold text-[var(--rp-text)] tracking-tighter uppercase flex items-center gap-2">
                                                <IconRadar size={20} className="text-[var(--rp-gold)]" /> Locked Signals
                                            </h2>
                                            <button onClick={clearSearch} className="text-[10px] text-[var(--rp-gold)] uppercase font-bold tracking-widest hover:text-[var(--rp-gold-strong)] flex items-center gap-1">
                                                <IconX size={10} /> Clear
                                            </button>
                                        </div>
                                        {searchResultStations.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {searchResultStations.map(station => (
                                                    <div
                                                        key={station.uuid}
                                                        onClick={() =>
                                                            handlePlay(
                                                                station,
                                                                createQueueSession({
                                                                    sourceType: 'world',
                                                                    sourceLabel: `World Search: ${agentMessage ?? 'Results'}`,
                                                                    stations: searchResultStations,
                                                                    context: {
                                                                        view: 'world',
                                                                        query: agentMessage ?? aiPrompt,
                                                                    },
                                                                    seed: agentMessage ?? aiPrompt,
                                                                })
                                                            )}
                                                        className={`p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden ${nowPlaying?.uuid === station.uuid ? 'bg-[rgba(245,177,45,0.12)] border-[rgba(245,177,45,0.4)]' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
                                                    >
                                                        <div className="flex items-start gap-4 relative z-10">
                                                            <div className="w-12 h-12 rounded-lg bg-black/60 overflow-hidden shrink-0 shadow-lg">
                                                                {station.favicon ? (
                                                                    <img src={station.favicon} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full"><IconBroadcast size={16} className="text-white/20" /></div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className={`font-bold truncate ${nowPlaying?.uuid === station.uuid ? 'text-[var(--rp-gold)]' : 'text-[var(--rp-text)] group-hover:text-[var(--rp-gold-strong)]'}`}>{station.name}</h3>
                                                                <p className="text-xs text-[var(--rp-muted)] truncate">{station.country} • {station.tags?.slice(0, 30)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center border border-dashed border-white/10 rounded-xl">
                                                <p className="text-sm text-[var(--rp-muted)]">No signals found on this frequency.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        {curatedRows.map((row, idx) => (
                                            <div key={idx} className="space-y-4 animate-fade-in">
                                                <div className="flex flex-col gap-1 border-l-2 border-[rgba(245,177,45,0.3)] pl-4">
                                                    <h2 className="text-xl font-bold text-[var(--rp-text)] tracking-tight uppercase">{row.title}</h2>
                                                    <p className="text-xs text-[var(--rp-muted)] font-mono">{row.description}</p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {row.stations.map(station => (
                                                        <div
                                                            key={station.uuid}
                                                            onClick={() =>
                                                                handlePlay(
                                                                    station,
                                                                    createQueueSession({
                                                                        sourceType: 'world',
                                                                        sourceLabel: row.title,
                                                                        stations: row.stations,
                                                                        context: {
                                                                            view: 'world',
                                                                            description: row.description,
                                                                        },
                                                                        seed: row.title,
                                                                    })
                                                                )}
                                                            className={`p-3 rounded-lg border transition-all cursor-pointer group flex items-center gap-3 ${nowPlaying?.uuid === station.uuid ? 'bg-[rgba(245,177,45,0.12)] border-[rgba(245,177,45,0.4)]' : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-black/60'}`}
                                                        >
                                                            <div className="w-10 h-10 rounded bg-black/60 overflow-hidden shrink-0">
                                                                {station.favicon ? (
                                                                    <img src={station.favicon} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full"><IconBroadcast size={14} className="text-white/20" /></div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className={`text-sm font-bold truncate ${nowPlaying?.uuid === station.uuid ? 'text-[var(--rp-gold)]' : 'text-[var(--rp-text)]'}`}>{station.name}</h4>
                                                                <p className="text-[10px] text-[var(--rp-muted)] truncate">{station.country}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <PassportView entries={passport} />
                        )}
                    </div>

                    <aside className="hidden lg:block lg:col-span-4 sticky top-32">
                        {nowPlaying ? (
                            <div className="animate-fade-in-up">
                                <StationDossier
                                    station={nowPlaying}
                                    context={currentContext}
                                    loading={isContextLoading}
                                    onRecommendationClick={() => { }}
                                />
                            </div>
                        ) : (
                            <div className="p-12 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center opacity-60 h-[400px]">
                                <IconSatellite size={48} className="mb-4 text-[var(--rp-muted-2)]" />
                                <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--rp-muted)]">Awaiting Signal Link...</p>
                            </div>
                        )}
                    </aside>

                    {/* Mobile Terminal Drawer */}
                    <Drawer
                        opened={terminalOpened}
                        onClose={() => setTerminalOpened(false)}
                        size="92%"
                        position="bottom"
                        padding={0}
                        withCloseButton={false}
                        styles={{
                            content: {
                                backgroundColor: 'transparent',
                                borderTopLeftRadius: '32px',
                                borderTopRightRadius: '32px',
                                overflow: 'hidden'
                            },
                            body: {
                                height: '100%',
                                overflow: 'hidden'
                            },
                            overlay: {
                                backdropFilter: 'blur(8px)',
                                backgroundColor: 'rgba(0,0,0,0.6)'
                            }
                        }}
                    >
                        <div className="h-full flex flex-col">
                            {/* Drag/Close Handle */}
                            <div className="flex justify-center p-3 cursor-pointer" onClick={() => setTerminalOpened(false)}>
                                <div className="w-12 h-1.5 rounded-full bg-white/20" />
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                {nowPlaying && (
                                    <StationDossier
                                        station={nowPlaying}
                                        context={currentContext}
                                        loading={isContextLoading}
                                        onRecommendationClick={() => { }}
                                    />
                                )}
                            </div>
                        </div>
                    </Drawer>

                    {/* Floating HUD Toggle Button - Mobile only */}
                    {nowPlaying && !terminalOpened && (
                        <div className="lg:hidden fixed bottom-36 right-6 z-60 animate-fade-in">
                            <Tooltip label="Open Terminal HUD" position="left">
                                <ActionIcon
                                    size={64}
                                    radius="xl"
                                    className="bg-[var(--rp-gold)] shadow-[0_0_30px_rgba(245,177,45,0.4)] border-2 border-white/20 hover:scale-110 active:scale-95 transition-all group"
                                    onClick={() => setTerminalOpened(true)}
                                >
                                    <div className="relative">
                                        <IconMicroscope size={28} className="text-black group-hover:animate-bounce" />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[var(--rp-gold)] animate-pulse" />
                                    </div>
                                </ActionIcon>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
