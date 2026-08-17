import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import PublicLiveBoard from "./components/PublicLiveBoard.jsx";
import PublicCheckin from "./components/PublicCheckin.jsx";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/live/:clubId" element={<PublicLiveBoard />} />
        <Route path="/checkin/:clubId" element={<PublicCheckin />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);


