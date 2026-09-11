import { useLocation, useNavigate } from "@remix-run/react";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import { homeWithPassportHref, openPassportNow } from "./productFlow";

/**
 * The one toast surface. Reads the single-slot player notice channel and
 * files it above the dock: stamp INKEDs with their dispatch headline, and
 * stream warnings/errors from the audio engine. Errors assert; everything
 * else politely announces. Only passport-action notices are tappable.
 */
export function ToastChannel() {
  const location = useLocation();
  const navigate = useNavigate();
  const notice = usePlayerNoticeStore((state) => state.notice);
  const clearNotice = usePlayerNoticeStore((state) => state.clearNotice);

  if (!notice) return null;

  const kindClass =
    notice.kind === "info" ? "" : ` is-${notice.kind}`;
  const body = (
    <>
      {notice.title ? (
        <span className="rp-eyebrow text-foil">{notice.title}</span>
      ) : null}
      <strong>{notice.message}</strong>
      {notice.detail ? <small>{notice.detail}</small> : null}
      {notice.footnote ? (
        <em className="rp-toast-line">{notice.footnote}</em>
      ) : null}
    </>
  );

  if (notice.action === "passport") {
    return (
      <button
        type="button"
        className={`rp-toast text-left${kindClass}`}
        role="status"
        aria-live="polite"
        onClick={() => {
          clearNotice(notice.id);
          openPassportNow(location.pathname, () =>
            navigate(homeWithPassportHref())
          );
        }}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={`rp-toast${kindClass}`}
      role={notice.kind === "error" ? "alert" : "status"}
      aria-live={notice.kind === "error" ? "assertive" : "polite"}
    >
      {body}
    </div>
  );
}
