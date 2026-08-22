import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { I18nProvider } from "./i18n/index.jsx";
import { registerSW } from "virtual:pwa-register";

// Lazy-load public pages (not needed on initial operator load)
const PublicLiveBoard = lazy(() => import("./components/PublicLiveBoard.jsx"));
const PublicCheckin = lazy(() => import("./components/PublicCheckin.jsx"));
const PublicInvite = lazy(() => import("./components/PublicInvite.jsx"));
const PublicChallenge = lazy(() => import("./components/PublicChallenge.jsx"));
const PlayerDashboard = lazy(() => import("./components/PlayerDashboard.jsx"));

registerSW({
  immediate: true,
});

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <img src="/logo.png" alt="" className="w-12 h-12 mx-auto mb-4 animate-pulse" />
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/live/:clubId" element={<PublicLiveBoard />} />
              <Route path="/checkin/:clubId" element={<PublicCheckin />} />
              <Route path="/challenge/:clubId" element={<PublicChallenge />} />
              <Route path="/player/:clubId/:playerName" element={<PlayerDashboard />} />
              <Route path="/invite/:inviteCode" element={<PublicInvite />} />
              <Route path="*" element={<App />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>
);
