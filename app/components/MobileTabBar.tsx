import { Link, useLocation } from "@remix-run/react";
import { IconHome, IconCompass } from "@tabler/icons-react";

type Tab = { to: string; label: string; icon: React.ComponentType<any> };

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: IconHome },
  { to: "/about", label: "About", icon: IconCompass },
];

export default function MobileTabBar() {
  const location = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/60 bg-[#e0e5ec]/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] transition-all duration-300">
      <ul className="grid grid-cols-2 h-16 items-center">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = (to === "/" && location.pathname === "/" && !location.search) ||
            (to !== "/" && (location.pathname + location.search).startsWith(to));
          return (
            <li key={to} className="h-full">
              <Link
                to={to}
                prefetch="intent"
                className={`flex h-full flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                <Icon size={22} stroke={active ? 2.5 : 1.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

