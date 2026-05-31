import { useEffect, useRef, useState } from "react";
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

function stripLocaleFromPath(path: string, base: string): string {
  // Strip base prefix first ("/acta/" → "/acta", then remove from path start)
  const basePrefix = base === "/" ? "" : base.replace(/\/$/, "");
  const withoutBase =
    basePrefix && path.startsWith(basePrefix) ? path.slice(basePrefix.length) || "/" : path;
  const segments = withoutBase.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) {
    return `/${segments.slice(1).join("/")}` || "/";
  }
  return withoutBase || "/";
}

function buildTargetUrl(locale: Locale, base: string): string {
  const bare = stripLocaleFromPath(window.location.pathname, base);
  const basePrefix = base === "/" ? "" : base.replace(/\/$/, "");
  const localizedPath =
    locale === defaultLocale
      ? bare
      : bare === "/"
        ? `/${locale}/`
        : `/${locale}${bare.startsWith("/") ? bare : `/${bare}`}`;
  return `${basePrefix}${localizedPath}${window.location.search}${window.location.hash}`;
}

type Props = { labels: Record<Locale, string>; legend: string; base?: string };

export default function LanguageSwitcher({
  labels,
  legend,
  base = import.meta.env.BASE_URL,
}: Props) {
  ensureClientI18n();
  const [current, setCurrent] = useState<Locale>(defaultLocale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(readLocale());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const update = (next: Locale) => {
    setOpen(false);
    if (next === current) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.assign(buildTargetUrl(next, base));
  };

  return (
    <div className="lang-switcher" ref={rootRef}>
      <button
        type="button"
        className="lang-trigger"
        aria-label={legend}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="code">{current.toUpperCase()}</span>
        <span className="name">{labels[current]}</span>
        <span className="caret" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div className="lang-menu" role="listbox" aria-label={legend}>
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={code === current}
              className={code === current ? "is-active" : ""}
              onClick={() => update(code)}
            >
              <span className="code">{code.toUpperCase()}</span>
              <span className="name">{labels[code]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
