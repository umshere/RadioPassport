import { Link, useLocation } from "@remix-run/react";
import { BRAND } from "~/constants/brand";

type SignalMarkProps = {
  size?: number;
  compact?: boolean;
  onHome?: () => void;
};

export function SignalMark({ size = 28 }: SignalMarkProps) {
  return (
    <img
      src="/elsewhere-mark.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

export function SignalWordmark({ compact = false, onHome }: SignalMarkProps) {
  const { pathname } = useLocation();
  return (
    <Link
      to="/"
      prefetch="intent"
      className="inline-flex items-center gap-2.5 text-left"
      aria-label={`${BRAND.name} home`}
      onClick={(event) => {
        if (!onHome || pathname !== "/") return;
        event.preventDefault();
        onHome();
      }}
    >
      <SignalMark size={compact ? 26 : 32} />
      <strong className="block font-display text-[24px] font-normal italic leading-none tracking-[-0.02em] text-bone">
        {BRAND.name}
      </strong>
    </Link>
  );
}
