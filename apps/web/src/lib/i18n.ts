import i18next, { type i18n as I18nInstance } from "i18next";

const localeModules = import.meta.glob("../locales/**/*.json", { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

export type Locale = "en" | "ru";
export const locales: Locale[] = ["en", "ru"];
export const defaultLocale: Locale = "en";

type Resources = Record<string, Record<string, Record<string, unknown>>>;

function buildResources(): Resources {
  const out: Resources = {};
  for (const [path, mod] of Object.entries(localeModules)) {
    const match = path.match(/\/locales\/([^/]+)\/([^/]+)\.json$/);
    if (!match) continue;
    const [, lang, ns] = match;
    out[lang] ??= {};
    out[lang][ns] = mod.default;
  }
  return out;
}

export const resources = buildResources();

const namespaces = Object.keys(resources[defaultLocale] ?? {});

let initPromise: Promise<I18nInstance> | null = null;

export function getI18n(locale: Locale = defaultLocale): Promise<I18nInstance> {
  if (!initPromise) {
    initPromise = i18next
      .init({
        lng: locale,
        fallbackLng: defaultLocale,
        ns: namespaces,
        defaultNS: "common",
        resources: Object.fromEntries(
          Object.entries(resources).map(([lang, ns]) => [
            lang,
            Object.fromEntries(Object.entries(ns).map(([k, v]) => [k, v as object])),
          ]),
        ),
        interpolation: { escapeValue: false },
        returnNull: false,
      })
      .then(() => i18next);
  }
  return initPromise.then(async (instance) => {
    if (instance.language !== locale) {
      await instance.changeLanguage(locale);
    }
    return instance;
  });
}

export type TFunc = (key: string, params?: Record<string, unknown>) => string;

export async function getT(locale: Locale = defaultLocale): Promise<TFunc> {
  const instance = await getI18n(locale);
  const fixedT = instance.getFixedT(locale);
  return (key, params) => fixedT(key, params) as string;
}

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ru";
}

export function getLocaleFromUrl(url: URL): Locale {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) return segments[0];
  return defaultLocale;
}

export function localizedHref(
  locale: Locale,
  path: string,
  base = import.meta.env.BASE_URL,
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const localizedPath =
    locale === defaultLocale
      ? normalized
      : normalized === "/"
        ? `/${locale}/`
        : `/${locale}${normalized}`;
  // BASE_URL is "/" in dev or "/acta/" in prod — strip trailing slash for concat
  const basePrefix = base === "/" ? "" : base.replace(/\/$/, "");
  return `${basePrefix}${localizedPath}`;
}
