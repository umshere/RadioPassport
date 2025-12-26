import { Link } from "@remix-run/react";
import { Text } from "@mantine/core";
import { IconBrandGithub, IconHeart, IconExternalLink } from "@tabler/icons-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative z-10 mt-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200/60 bg-white/80 px-6 py-6 shadow-sm backdrop-blur-sm sm:px-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    {/* Links Section */}
                    <div className="flex flex-wrap gap-12 text-sm">
                        <div className="flex flex-col gap-1.5">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase" className="tracking-[0.24em] text-slate-400 mb-1">
                                Explore
                            </Text>
                            <Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors">
                                Home
                            </Link>
                            <Link to="/?view=world" className="text-slate-600 hover:text-slate-900 transition-colors">
                                World Mode
                            </Link>
                            <Link to="/about" className="text-slate-600 hover:text-slate-900 transition-colors">
                                About
                            </Link>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase" className="tracking-[0.24em] text-slate-400 mb-1">
                                Resources
                            </Text>
                            <a
                                href="https://www.radio-browser.info/"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Data: Radio-Browser
                                <IconExternalLink size={11} className="opacity-60" />
                            </a>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                <IconBrandGithub size={13} className="opacity-70" />
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-6 flex flex-col items-center gap-2 border-t border-slate-200/50 pt-4 md:flex-row md:justify-between">
                    <Text size="xs" c="dimmed" className="flex items-center gap-1 text-slate-400">
                        Built with <IconHeart size={11} className="text-rose-400" fill="currentColor" /> for music lovers
                    </Text>
                    <Text size="xs" c="dimmed" className="text-slate-400">
                        © {currentYear} Radio Passport. All rights reserved.
                    </Text>
                </div>
            </div>
        </footer>
    );
}
