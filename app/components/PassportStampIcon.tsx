type PassportStampIconProps = {
  size?: number;
  animated?: boolean;
  id?: string;
  className?: string;
};

let idCounter = 0;

export default function PassportStampIcon({
  size = 72,
  animated = true,
  id,
  className,
}: PassportStampIconProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '12px',
        background: !className ? '#e0e5ec' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: !className ? '6px 6px 12px #b8b9be, -6px -6px 12px #ffffff' : undefined,
      }}
    >
      <span
        style={{
          fontSize: size * 0.4,
          fontWeight: 'bold',
          color: '#64748b',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        RP
      </span>
    </div>
  );
}
