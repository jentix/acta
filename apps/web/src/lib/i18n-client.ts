import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLocale, isLocale, type Locale, resources } from "./i18n.js";

let started = false;

export function ensureClientI18n(): void {
  if (started) return;
  started = true;
  const lang = readClientLocale();
  i18next.use(initReactI18next).init({
    lng: lang,
    fallbackLng: defaultLocale,
    ns: Object.keys(resources[defaultLocale] ?? {}),
    defaultNS: "common",
    resources: Object.fromEntries(
      Object.entries(resources).map(([code, ns]) => [
        code,
        Object.fromEntries(Object.entries(ns).map(([k, v]) => [k, v as object])),
      ]),
    ),
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export function readClientLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const fromHtml = document.documentElement.lang;
  if (isLocale(fromHtml)) return fromHtml;
  return defaultLocale;
}
