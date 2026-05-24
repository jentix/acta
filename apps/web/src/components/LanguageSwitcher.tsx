import { useEffect, useState } from "react";
import { defaultLocale, isLocale, type Locale, locales } from "../lib/i18n.js";
import { ensureClientI18n } from "../lib/i18n-client.js";

const STORAGE_KEY = "acta-locale";
const COOKIE_KEY = "acta-locale";

function readLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored ?? "")) return stored as Locale;
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : defaultLocale;
}

function stripLocaleFromPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) {
    return `/${segments.slice(1).join("/")}` || "/";
  }
  return path || "/";
}

function buildTargetUrl(locale: Locale): string {
  const bare = stripLocaleFromPath(window.location.pathname);
  const path =
    locale === defaultLocale
      ? bare
      : bare === "/"
        ? `/${locale}/`
        : `/${locale}${bare.startsWith("/") ? bare : `/${bare}`}`;
  return `${path}${window.location.search}${window.location.hash}`;
}

type Props = { labels: Record<Locale, string>; legend: string };

export default function LanguageSwitcher({ labels, legend }: Props) {
  ensureClientI18n();
  const [current, setCurrent] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setCurrent(readLocale());
  }, []);

  const update = (next: Locale) => {
    if (next === current) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.assign(buildTargetUrl(next));
  };

  return (
    <fieldset className="ui-theme-toggle" aria-label={legend}>
      <legend>{legend}</legend>
      {locales.map((code) => (
        <label key={code}>
          <input
            type="radio"
            name="acta-locale"
            value={code}
            checked={current === code}
            onChange={() => update(code)}
          />
          <span title={labels[code]}>
            <span className="sr-only">{labels[code]}</span>
            <span aria-hidden="true">{code.toUpperCase()}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
