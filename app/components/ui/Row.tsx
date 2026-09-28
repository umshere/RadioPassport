import { createElement } from "react";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * One row: something on the left, a name and a line under it, something on
 * the right. Two shapes, same anatomy —
 *
 *   list  hairline underneath, no box (stations on the board, the queue)
 *   tile  a 2px-square boxed cell in a grid (Atlas countries)
 *
 * `active` marks what is playing (the name goes lacquer); `unavailable`
 * dims a row that cannot be entered. Pass `as="button"` when the whole row
 * is the tap target; keep `as="div"` when it holds its own buttons.
 */
export type RowVariant = "list" | "tile";

const VARIANT_CLASS: Record<RowVariant, string> = {
  list: "rp-station",
  tile: "rp-country",
};

type Props = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  variant?: RowVariant;
  as?: "div" | "button";
  active?: boolean;
  unavailable?: boolean;
  disabled?: boolean;
  pending?: boolean;
  type?: "button";
  children?: ReactNode;
};

export function rowClass({
  variant = "list",
  active,
  unavailable,
  pending,
  className,
}: {
  variant?: RowVariant;
  active?: boolean;
  unavailable?: boolean;
  pending?: boolean;
  className?: string;
}) {
  return [
    VARIANT_CLASS[variant],
    active ? "is-active" : "",
    unavailable ? "is-unavailable" : "",
    pending ? "is-pending" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Row({
  variant = "list",
  as = "div",
  active,
  unavailable,
  pending,
  className,
  children,
  ...rest
}: Props) {
  return createElement(
    as,
    {
      ...rest,
      ...(as === "button" ? { type: "button" } : {}),
      className: rowClass({ variant, active, unavailable, pending, className }),
    },
    children,
  );
}

/** The name and the line beneath it. */
export function RowText({
  title,
  sub,
  variant = "list",
}: {
  title: ReactNode;
  sub?: ReactNode;
  variant?: RowVariant;
}) {
  return variant === "tile" ? (
    <span className="min-w-0 flex-1 text-left">
      <strong className="block truncate">{title}</strong>
      {sub ? <small className="block truncate text-muted">{sub}</small> : null}
    </span>
  ) : (
    <>
      <strong className="ew-station-name">{title}</strong>
      {sub ? <span className="ew-station-place">{sub}</span> : null}
    </>
  );
}
