import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import PublicLiveBoard from "./components/PublicLiveBoard.jsx";
import PublicCheckin from "./components/PublicCheckin.jsx";
import PublicInvite from "./components/PublicInvite.jsx";
import PublicChallenge from "./components/PublicChallenge.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { I18nProvider } from "./i18n/index.jsx";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/live/:clubId" element={<PublicLiveBoard />} />
            <Route path="/checkin/:clubId" element={<PublicCheckin />} />
            <Route path="/challenge/:clubId" element={<PublicChallenge />} />
            <Route path="/invite/:inviteCode" element={<PublicInvite />} />
            <Route path="*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>
);
