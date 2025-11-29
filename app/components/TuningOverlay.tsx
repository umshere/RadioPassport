import { useNavigation } from "@remix-run/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function TuningOverlay() {
    const navigation = useNavigation();
    const [isVisible, setIsVisible] = useState(false);
    const isLoading = navigation.state !== "idle";

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isLoading) {
            // Show immediately when loading starts
            setIsVisible(true);
        } else {
            // Hide quickly when loading completes
            timeout = setTimeout(() => setIsVisible(false), 150);
        }
        return () => clearTimeout(timeout);
    }, [isLoading]);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ${isLoading ? "opacity-100" : "opacity-0"
                }`}
        >
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" />

            <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[rgba(12,20,36,0.88)] px-6 py-4 shadow-2xl backdrop-blur">
                    <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-100/80">
                        Tuning
                    </span>
                    <div className="flex h-7 items-end gap-[4px]">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <motion.span
                                key={index}
                                className="w-[6px] rounded-full bg-[rgba(199,158,73,0.85)]"
                                animate={{ height: [10, 26, 12] }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    repeatType: "mirror",
                                    delay: index * 0.08,
                                    ease: "easeInOut",
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
