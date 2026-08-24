import { useState, useRef, createContext, useContext, useCallback } from "react";

const ToastContext = createContext();

function ToastItem({ toast, onDismiss }) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const ref = useRef(null);

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (ref.current) ref.current.style.transform = `translateX(${diff}px)`;
  };
  const handleTouchEnd = () => {
    const diff = currentX.current - startX.current;
    if (Math.abs(diff) > 80) {
      onDismiss(toast.id);
    } else if (ref.current) {
      ref.current.style.transform = "translateX(0)";
    }
  };

  return (
    <div
      ref={ref}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => onDismiss(toast.id)}
      className={`
        px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium cursor-pointer
        animate-[fadeIn_0.2s_ease-out] transition-transform
        pointer-events-auto select-none
        ${toast.type === "success" ? "bg-green-600 text-white" : ""}
        ${toast.type === "error" ? "bg-red-600 text-white" : ""}
        ${toast.type === "info" ? "bg-blue-600 text-white" : ""}
        ${toast.type === "warning" ? "bg-amber-500 text-white" : ""}
      `}
    >
      {toast.type === "success" && "✓ "}
      {toast.type === "error" && "✗ "}
      {toast.type === "info" && "ℹ "}
      {toast.type === "warning" && "⚠ "}
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
