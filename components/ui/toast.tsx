"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";
type ToastInput = {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
};

type ToastApi = {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
};

type ToastContextValue = { toast: ToastApi };

const ToastContext = createContext<ToastContextValue | null>(null);

const toastAppearance = {
  success: {
    icon: CheckCircle2,
    title: "Success",
    iconClass: "bg-emerald-50 text-emerald-600",
    accent: "bg-emerald-500",
    progress: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    title: "Something went wrong",
    iconClass: "bg-rose-50 text-rose-600",
    accent: "bg-rose-500",
    progress: "bg-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    title: "Attention",
    iconClass: "bg-amber-50 text-amber-600",
    accent: "bg-amber-500",
    progress: "bg-amber-500",
  },
  info: {
    icon: Info,
    title: "Information",
    iconClass: "bg-blue-50 text-blue-600",
    accent: "bg-blue-500",
    progress: "bg-blue-500",
  },
} satisfies Record<ToastType, {
  icon: typeof CheckCircle2;
  title: string;
  iconClass: string;
  accent: string;
  progress: string;
}>;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastInput[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4200) => {
    const id = ++nextId.current;
    const safeDuration = Math.max(1500, duration);

    setItems((current) => [...current, { id, type, message, duration: safeDuration }].slice(-4));
    const timer = setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
      timers.current.delete(id);
    }, safeDuration);
    timers.current.set(id, timer);
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const toast = useMemo<ToastApi>(() => ({
    success: (message, duration) => addToast("success", message, duration),
    error: (message, duration) => addToast("error", message, duration),
    warning: (message, duration) => addToast("warning", message, duration),
    info: (message, duration) => addToast("info", message, duration),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed right-3 top-3 z-[9999] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-3 sm:right-5 sm:top-5"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        {items.map((item) => {
          const appearance = toastAppearance[item.type];
          const Icon = appearance.icon;

          return (
            <div
              key={item.id}
              role={item.type === "error" ? "alert" : "status"}
              className="pointer-events-auto relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_55px_-18px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.03] toast-enter"
            >
              <div className="flex items-start gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${appearance.iconClass}`}>
                  <Icon size={20} strokeWidth={2.3} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-bold text-slate-900">{appearance.title}</p>
                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-600">{item.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                  className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="h-1 w-full bg-slate-100">
                <div
                  className={`h-full origin-left ${appearance.progress} toast-progress`}
                  style={{ animationDuration: `${item.duration}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        @keyframes toast-enter {
          from { opacity: 0; transform: translate3d(18px, -6px, 0) scale(0.98); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        .toast-enter { animation: toast-enter 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .toast-progress { animation-name: toast-progress; animation-timing-function: linear; animation-fill-mode: forwards; }
        @media (prefers-reduced-motion: reduce) {
          .toast-progress { animation: none; transform: scaleX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
