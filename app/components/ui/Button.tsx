import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "@remix-run/react";
import type { LinkProps } from "@remix-run/react";

/**
 * The one place a control's markup is decided. Variants map to the design
 * system's Button states page: colours, sizes and states live in the
 * stylesheet, keyed by these class names; this layer fixes *which* class, the
 * ARIA that goes with each state, and a default `type="button"`.
 *
 *   land    the lacquer customs stamp — one per screen
 *   mono    foil-framed mono action (Surprise)
 *   frame   the header's Passport frame
 *   text    quiet foil text action
 *   atlas   foil-ruled wayfinding link
 *   chip    square filter chip (use <Chip> for the pressed/selected form)
 *   keeper  the keeper figure as a control (opens its sheet); no chrome
 */
export type ButtonVariant =
  | "land"
  | "mono"
  | "frame"
  | "text"
  | "atlas"
  | "chip"
  | "keeper";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  land: "ew-land",
  mono: "rp-surprise",
  frame: "rp-passport-button",
  text: "rp-text-button",
  atlas: "ew-atlas",
  chip: "rp-chip",
  keeper: "ew-keeper-button",
};

export function buttonClass({
  variant,
  selected,
  busy,
  className,
}: {
  variant: ButtonVariant;
  selected?: boolean;
  busy?: boolean;
  className?: string;
}) {
  return [
    VARIANT_CLASS[variant],
    selected ? "active" : "",
    busy ? "is-busy" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

type CommonProps = {
  variant?: ButtonVariant;
  /** Pressed / selected: sets `.active` and `aria-pressed`. Omit for plain actions. */
  selected?: boolean;
  /** Working: pulses, shows progress cursor, sets `aria-busy`; keeps its size. */
  busy?: boolean;
  /** Land only: the mono kicker above the label. */
  kicker?: ReactNode;
};

function labelled(variant: ButtonVariant, kicker: ReactNode, children: ReactNode) {
  if (variant !== "land" || kicker == null) return children;
  return (
    <>
      <span className="ew-land-kicker">{kicker}</span>
      <span className="ew-land-city">{children}</span>
    </>
  );
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "text", selected, busy, kicker, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, selected, busy, className })}
      aria-pressed={selected === undefined ? undefined : selected}
      aria-busy={busy || undefined}
      {...rest}
    >
      {labelled(variant, kicker, children)}
    </button>
  );
});

export type ButtonLinkProps = CommonProps & Omit<LinkProps, "className"> & { className?: string };

/** Same look, navigates: for a control that is really a route change. */
export function ButtonLink({
  variant = "text",
  selected,
  busy,
  kicker,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, selected, busy, className })} {...rest}>
      {labelled(variant, kicker, children)}
    </Link>
  );
}

/** A filter chip: square, 44px, foil when selected. */
export const Chip = forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(function Chip(
  props,
  ref,
) {
  return <Button ref={ref} variant="chip" {...props} />;
});
