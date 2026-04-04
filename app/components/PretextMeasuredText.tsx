import { useElementSize } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { getPretextLines, preparePretext } from "~/utils/pretextLayout";

type PretextMeasuredTextProps = {
  text: string;
  font: string;
  lineHeight: number;
  collapsedLines?: number;
  expandable?: boolean;
  className?: string;
  lineClassName?: string;
  fallbackClassName?: string;
  moreLabel?: string;
  lessLabel?: string;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PretextMeasuredText({
  text,
  font,
  lineHeight,
  collapsedLines,
  expandable = false,
  className,
  lineClassName,
  fallbackClassName,
  moreLabel = "Show more",
  lessLabel = "Show less",
}: PretextMeasuredTextProps) {
  const { ref, width } = useElementSize();
  const [isReady, setIsReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    setIsExpanded(false);
  }, [text]);

  const prepared = useMemo(() => {
    if (!isReady || !text.trim()) return null;
    return preparePretext(text, font);
  }, [font, isReady, text]);

  const lines = useMemo(() => {
    if (!prepared || width <= 0) return null;
    return getPretextLines(text, font, width, lineHeight);
  }, [font, lineHeight, prepared, text, width]);

  const visibleLines =
    collapsedLines && !isExpanded && lines ? lines.slice(0, collapsedLines) : lines;
  const isTruncated = Boolean(
    lines &&
      collapsedLines &&
      collapsedLines > 0 &&
      lines.length > collapsedLines
  );

  return (
    <div ref={ref} className={className}>
      {visibleLines ? (
        <div aria-label={text}>
          {visibleLines.map((line, index) => (
            <span
              key={`${index}-${line.start.segmentIndex}-${line.start.graphemeIndex}`}
              className={joinClasses("block", lineClassName)}
              style={{ lineHeight: `${lineHeight}px` }}
            >
              {line.text || "\u00A0"}
            </span>
          ))}
        </div>
      ) : (
        <div
          className={fallbackClassName ?? lineClassName}
          style={
            collapsedLines && !isExpanded
              ? {
                  display: "-webkit-box",
                  WebkitLineClamp: collapsedLines,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: `${lineHeight}px`,
                }
              : { lineHeight: `${lineHeight}px` }
          }
        >
          {text}
        </div>
      )}

      {expandable && isTruncated && (
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="mt-2 inline-flex items-center rounded-full border border-[rgba(245,177,45,0.25)] bg-[rgba(245,177,45,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)] transition hover:bg-[rgba(245,177,45,0.14)]"
        >
          {isExpanded ? lessLabel : `${moreLabel} (${lines!.length - collapsedLines!} lines)`}
        </button>
      )}
    </div>
  );
}
