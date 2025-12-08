import { Link, useLocation } from "@remix-run/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    IconHome,
    IconWorld,
    IconCompass,
    IconMenu2,
    IconX,
    IconPlayerPlay,
    IconHeart,
    IconHistory,
    IconSettings,
    IconInfoCircle
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
    { to: "/world/cards", label: "World", icon: IconWorld },
    { to: "/about", label: "About", icon: IconCompass },
];

export default function MobileSidebarMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { nowPlaying, queue } = usePlayerStore();

    return (
        <>
            {/* Hamburger Menu Button - Top Left */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e0e5ec] text-slate-700 shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] transition-all"
                aria-label="Open menu"
                style={{
                    top: "calc(env(safe-area-inset-top, 0px) + 8px)",
                    right: "calc(env(safe-area-inset-right, 0px) + 16px)",
                }}
            >
                <IconMenu2 size={22} stroke={2.5} />
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
                        className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
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
                        className="lg:hidden fixed left-0 top-0 bottom-0 z-[60] w-72 bg-[#e0e5ec] shadow-2xl"
                        style={{
                            paddingBottom: "env(safe-area-inset-bottom)",
                        }}
                    >
                        {/* Header */}
                        <div className="relative flex items-center justify-between p-6 border-b border-slate-300/50">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-[#e0e5ec] shadow-[5px_5px_10px_#b8b9be,-5px_-5px_10px_#ffffff] flex items-center justify-center text-slate-700 font-black text-base tracking-wider">
                                    RP
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-black tracking-tight text-slate-800 whitespace-nowrap">Radio Passport</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Global sound atlas</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/50 bg-slate-200/30 text-slate-500 hover:bg-slate-300/50 hover:text-slate-800 transition-all"
                                aria-label="Close menu"
                            >
                                <IconX size={18} stroke={2.5} />
                            </button>
                        </div>

                        {/* Now Playing Section */}
                        {nowPlaying && (
                            <div className="p-4 border-b border-slate-300/50">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Now Playing
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 shadow-inner">
                                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0 shadow-sm">
                                        {nowPlaying.favicon ? (
                                            <img src={nowPlaying.favicon} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                                FM
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-900 truncate">{nowPlaying.name}</div>
                                        <div className="text-xs text-slate-500 truncate">{nowPlaying.country}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Menu */}
                        <nav className="flex-1 overflow-y-auto p-4">
                            <ul className="space-y-2">
                                {MENU_ITEMS.map(({ to, label, icon: Icon, badge }) => {
                                    const isActive = location.pathname === to;
                                    return (
                                        <li key={to}>
                                            <Link
                                                to={to}
                                                onClick={() => setIsOpen(false)}
                                                prefetch="intent"
                                                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-semibold transition-all ${isActive
                                                    ? "bg-slate-900 text-white shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff]"
                                                    : "bg-[#e0e5ec] text-slate-600 shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:text-slate-900 active:shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]"
                                                    }`}
                                            >
                                                <Icon size={20} stroke={2.5} />
                                                <span className="flex-1">{label}</span>
                                                {badge && (
                                                    <span className="px-2 py-0.5 text-xs font-bold bg-white/20 rounded-full">
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
                                <div className="mt-6 p-4 rounded-xl bg-white/30 shadow-inner">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                                        <IconPlayerPlay size={14} />
                                        Queue
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900">{queue.length}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {queue.length === 1 ? 'station' : 'stations'} ready
                                    </div>
                                </div>
                            )}
                        </nav>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-300/50">
                            <div className="text-xs text-center text-slate-500">
                                Radio Passport v1.0
                                <br />
                                Discover global sounds
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
