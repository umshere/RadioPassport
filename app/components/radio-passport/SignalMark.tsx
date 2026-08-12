type SignalMarkProps = { size?: number; compact?: boolean };

export function SignalMark({ size = 36, compact = false }: SignalMarkProps) {
  return (
    <span
      className="rp-mark"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
        <circle
          cx="32"
          cy="32"
          r="25"
          stroke="#E5535F"
          strokeWidth="2.2"
          strokeDasharray="2.4 3.4"
        />
        <circle cx="32" cy="32" r="4" fill="#F2EDE4" />
        <path
          d="M40 23c5 4 5 14 0 18"
          stroke="#E5535F"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M46 17c10 8 10 22 0 30"
          stroke="rgba(242,237,228,.55)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function SignalWordmark({ compact = false }: SignalMarkProps) {
  return (
    <span className="inline-flex items-center gap-2.5 text-left">
      <SignalMark size={compact ? 30 : 36} />
      <span className="leading-none">
        <strong className="block text-[14px] font-extrabold tracking-[-.05em] text-paper">
          RADIO PASSPORT
        </strong>
        {!compact && (
          <small className="rp-eyebrow mt-1 block">WORLD · LIVE</small>
        )}
      </span>
    </span>
  );
}
