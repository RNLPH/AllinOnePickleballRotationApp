import { createContext, useContext, useState, useEffect } from "react";
import en from "./en";
import de from "./de";
import es from "./es";
import fr from "./fr";
import pt from "./pt";
import ja from "./ja";
import zh from "./zh";
import ko from "./ko";
import fil from "./fil";

const translations = { en, de, es, fr, pt, ja, zh, ko, fil };

const LANG_KEY = "rallystack_language";

const I18nContext = createContext();

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "fil", label: "Filipino", flag: "🇵🇭" },
];

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "en");

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
