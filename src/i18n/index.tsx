import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import pt from "./locales/pt";
import en from "./locales/en";
import es from "./locales/es";

export type Language = "pt" | "en" | "es";

const locales: Record<Language, Record<string, string>> = { pt, en, es };

export const localeMap: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getInitialLanguage(): Language {
  const saved = localStorage.getItem("hc_language");
  if (saved === "pt" || saved === "en" || saved === "es") return saved;
  return "pt";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("hc_language", lang);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let str = locales[language][key] ?? locales.pt[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          const pattern = "{{" + k + "}}";
          while (str.includes(pattern)) {
            str = str.replace(pattern, String(v));
          }
        });
      }
      return str;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
