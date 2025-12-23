
import React from 'react';
import ReactCountryFlag from 'react-country-flag';
import { Station } from '~/types/radio';
import { IconHome, IconPlaneDeparture, IconSatellite } from '@tabler/icons-react';

interface SonicFlightTrackerProps {
    lastStation: Station | null;
    currentStation: Station | null;
    isTraveling: boolean;
}

export function SonicFlightTracker({ lastStation, currentStation, isTraveling }: SonicFlightTrackerProps) {
    // Fix for potential property name conflict (countrycode vs countryCode)
    // Casting to any to allow loose access as data source defines it lowercase but component needs CamelCase usually
    // But wait, ReactCountryFlag takes `countryCode`. Station object has `countrycode`.
    const getCode = (s: Station | null) => s ? ((s as any).countryCode || (s as any).countrycode) : null;

    const lastCode = getCode(lastStation);
    const currentCode = getCode(currentStation);

    return (
        <div className="relative px-4 py-2 bg-white/5 border border-white/5 rounded-2xl overflow-hidden h-14 flex items-center shadow-lg backdrop-blur-md w-full">
            <div className="flex items-center justify-between w-full relative z-10 px-2">
                {/* DEPARTURE */}
                <div className="flex items-center gap-3 min-w-[100px]">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {lastStation && lastCode ? (
                            <ReactCountryFlag countryCode={lastCode} svg style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <IconHome size={14} className="text-white/20" />
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold whitespace-nowrap">Departure</span>
                        <span className="text-[10px] text-white/60 font-medium truncate w-full">{lastStation?.country || 'Base Station'}</span>
                    </div>
                </div>

                {/* FLIGHT PATH */}
                <div className="flex-1 mx-4 relative">
                    <div className="h-[1px] w-full border-t border-dashed border-white/10"></div>
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 transition-all duration-[2000ms] ease-in-out z-10`}
                        style={{
                            left: isTraveling ? '100%' : '0%',
                            opacity: isTraveling ? 1 : 0.3,
                            transform: `translate(${isTraveling ? '-100%' : '0%'}, -50%)`
                        }}
                    >
                        <IconPlaneDeparture
                            size={16}
                            className={`text-yellow-500 fill-yellow-500/20 ${isTraveling ? 'animate-pulse' : ''}`}
                        />
                    </div>
                </div>

                {/* ARRIVAL */}
                <div className="flex items-center gap-3 min-w-[100px] justify-end text-right">
                    <div className="flex flex-col overflow-hidden items-end">
                        <span className="text-[8px] uppercase tracking-widest text-yellow-500 font-bold whitespace-nowrap">Arrival</span>
                        <span className="text-[10px] text-white font-bold truncate w-full">{currentStation?.country || 'Scanning...'}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0 transition-transform ${isTraveling ? 'scale-110 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}`}>
                        {currentStation && currentCode ? (
                            <ReactCountryFlag countryCode={currentCode} svg style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <IconSatellite size={14} className="text-yellow-500/50" />
                        )}
                    </div>
                </div>
            </div>

            {/* Background Pulse Effect */}
            <div className="absolute inset-0 opacity-10 flex items-center pointer-events-none">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent animate-[pulse_2s_infinite]"></div>
            </div>
        </div>
    );
}
