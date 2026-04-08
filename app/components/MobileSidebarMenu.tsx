import { Link, useLocation } from "@remix-run/react";
import { motion, AnimatePresence } from "framer-motion";
import { StationArtwork } from "./StationArtwork";
import {
    IconHome,
    IconCompass,
    IconMenu2,
    IconX,
    IconPlayerPlay
} from "@tabler/icons-react";
import { useState } from "react";
import { usePlayerStore } from "~/state/playerStore";

type MenuItem = {
    to: string;
    label: string;
    icon: React.ComponentType<any>;
    badge?: string | number;
};

const MENU_ITEMS: MenuItem[] = [
    { to: "/", label: "Home", icon: IconHome },
    { to: "/about", label: "About", icon: IconCompass },
];

export default function MobileSidebarMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const nowPlaying = usePlayerStore((state) => state.nowPlaying);
    const queue = usePlayerStore((state) => state.queue);

    return (
        <>
            {/* Hamburger Menu Button - Top Left */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-amber-100/80 transition-colors hover:text-amber-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/40"
                aria-label="Open menu"
                style={{
                    top: "calc(env(safe-area-inset-top, 0px) + 10px)",
                    right: "calc(env(safe-area-inset-right, 0px) + 16px)",
                }}
            >
                <IconMenu2 size={20} stroke={2} />
            </button>

            {/* Edge Swipe Trigger (Only when closed) */}
            {!isOpen && (
                <motion.div
                    className="lg:hidden fixed top-0 bottom-0 left-0 w-6 z-40"
                    onPan={(e, info) => {
                        if (info.offset.x > 50) {
                            setIsOpen(true);
                        }
                    }}
                />
            )}

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        drag="x"
                        dragConstraints={{ right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={(e, info) => {
                            if (info.offset.x < -50 || info.velocity.x < -500) {
                                setIsOpen(false);
                            }
                        }}
                        className="lg:hidden fixed left-0 top-0 bottom-0 z-[60] w-72 bg-[#0f1218] border-r border-amber-400/20 shadow-2xl"
                        style={{
                            paddingBottom: "env(safe-area-inset-bottom)",
                        }}
                    >
                        {/* Header */}
                        <div className="relative flex items-center justify-between p-6 border-b border-amber-400/20">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-[#141822] border border-amber-400/30 flex items-center justify-center text-amber-100 font-black text-base tracking-wider shadow-[0_10px_20px_rgba(0,0,0,0.45)]">
                                    RP
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-black tracking-tight text-amber-50 whitespace-nowrap">Radio Passport</h2>
                                    <p className="text-[10px] font-bold text-amber-100/60 uppercase tracking-widest whitespace-nowrap">Curated live radio</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/20 bg-[#141822] text-amber-100/70 hover:text-amber-100 transition-all"
                                aria-label="Close menu"
                            >
                                <IconX size={18} stroke={2.5} />
                            </button>
                        </div>

                        {/* Now Playing Section */}
                        {nowPlaying && (
                            <div className="p-4 border-b border-amber-400/20">
                                <div className="text-xs font-semibold text-amber-100/60 uppercase tracking-wider mb-2">
                                    Now Playing
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#151922] border border-amber-400/20">
                                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-[#1b1f2a] flex-shrink-0 shadow-sm">
                                        <StationArtwork
                                            station={nowPlaying}
                                            fallbackClassName="w-full h-full flex items-center justify-center text-amber-100/70 font-bold text-xs"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-amber-50 truncate">{nowPlaying.name}</div>
                                        <div className="text-xs text-amber-100/60 truncate">{nowPlaying.country}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Menu */}
                        <nav className="flex-1 overflow-y-auto p-4">
                            <ul className="space-y-2">
                                {MENU_ITEMS.map(({ to, label, icon: Icon, badge }) => {
                                    const isActive = (to === "/" && location.pathname === "/" && !location.search) ||
                                        (to !== "/" && (location.pathname + location.search).startsWith(to));
                                    return (
                                        <li key={to}>
                                            <Link
                                                to={to}
                                                onClick={() => setIsOpen(false)}
                                                prefetch="intent"
                                                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-semibold transition-all ${isActive
                                                    ? "bg-[#1b1f2a] text-amber-50 border border-amber-400/30 shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
                                                    : "bg-[#141822] text-amber-100/70 border border-transparent hover:border-amber-400/20 hover:text-amber-50"
                                                    }`}
                                            >
                                                <Icon size={20} stroke={2.5} />
                                                <span className="flex-1">{label}</span>
                                                {badge && (
                                                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-400/20 rounded-full text-amber-100">
                                                        {badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Queue Info */}
                            {queue.length > 0 && (
                                <div className="mt-6 p-4 rounded-xl bg-[#151922] border border-amber-400/20">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-100/60 uppercase tracking-wider mb-2">
                                        <IconPlayerPlay size={14} />
                                        Queue
                                    </div>
                                    <div className="text-2xl font-bold text-amber-50">{queue.length}</div>
                                    <div className="text-xs text-amber-100/60 mt-1">
                                        {queue.length === 1 ? 'station' : 'stations'} ready
                                    </div>
                                </div>
                            )}
                        </nav>

                        {/* Footer */}
                        <div className="p-4 border-t border-amber-400/20">
                            <div className="text-xs text-center text-amber-100/60">
                                Radio Passport v1.0
                                <br />
                                Discover something worth playing
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
