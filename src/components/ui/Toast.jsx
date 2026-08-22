import { useState, useEffect, createContext, useContext, useCallback } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

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
      {/* Toast container */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium
              animate-[fadeIn_0.2s_ease-out]
              pointer-events-auto
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
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
