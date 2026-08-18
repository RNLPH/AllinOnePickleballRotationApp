import { createContext, useContext, useState, useEffect } from "react";
import en from "./en";
import de from "./de";

const translations = { en, de };

const LANG_KEY = "rallystack_language";

const I18nContext = createContext();

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
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
