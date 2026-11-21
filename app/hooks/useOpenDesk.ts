import { useLocation, useNavigate } from "@remix-run/react";
import type { MouseEventHandler } from "react";
import { hallReturnToDesk } from "~/utils/hallReturn";

/** Every Desk entrance saves the same Hall context for this tab's return trip. */
export function useOpenDesk(viewTransition = false): MouseEventHandler<HTMLAnchorElement> {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (pathname === "/listen") {
      event.preventDefault();
      return;
    }
    if (pathname !== "/") return;
    event.preventDefault();
    const { to, state } = hallReturnToDesk();
    navigate(to, { state, preventScrollReset: true, viewTransition });
  };
}
