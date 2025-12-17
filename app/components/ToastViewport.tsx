import { useToastStore } from "~/state/toastStore";

function getToastStyles(kind: "info" | "success" | "warning" | "error") {
  switch (kind) {
    case "success":
      return {
        surface: "bg-emerald-50 border-emerald-200 text-emerald-950",
        dot: "bg-emerald-500",
      };
    case "warning":
      return {
        surface: "bg-amber-50 border-amber-200 text-amber-950",
        dot: "bg-amber-500",
      };
    case "error":
      return {
        surface: "bg-rose-50 border-rose-200 text-rose-950",
        dot: "bg-rose-500",
      };
    default:
      return {
        surface: "bg-slate-50 border-slate-200 text-slate-900",
        dot: "bg-slate-500",
      };
  }
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-[120] flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-md space-y-2">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.kind);
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.16)] backdrop-blur ${styles.surface}`}
              role="status"
              aria-live="polite"
              onClick={() => removeToast(toast.id)}
            >
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${styles.dot}`} />
              <div className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                {toast.message}
              </div>
              <button
                type="button"
                className="text-xs font-bold uppercase tracking-[0.25em] opacity-70 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
              >
                Dismiss
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

