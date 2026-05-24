import { useEffect, useState } from "react";

type Pref = "system" | "light" | "dark";

const STORAGE_KEY = "acta-theme";

function resolveTheme(pref: Pref): "light" | "dark" {
  if (pref !== "system") return pref;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readPref(): Pref {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function applyPref(pref: Pref): void {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePref = pref;
}

const SYMBOLS: Record<Pref, string> = { system: "◐", light: "☀", dark: "☾" };

type Props = {
  labels: { legend: string; system: string; light: string; dark: string };
};

export default function ThemeToggle({ labels }: Props) {
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    setPref(readPref());
  }, []);

  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyPref("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [pref]);

  const update = (next: Pref) => {
    setPref(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyPref(next);
  };

  const options: Pref[] = ["system", "light", "dark"];

  return (
    <fieldset className="ui-theme-toggle" aria-label={labels.legend}>
      <legend>{labels.legend}</legend>
      {options.map((value) => (
        <label key={value}>
          <input
            type="radio"
            name="acta-theme"
            value={value}
            checked={pref === value}
            onChange={() => update(value)}
          />
          <span title={labels[value]}>
            <span className="sr-only">{labels[value]}</span>
            <span aria-hidden="true">{SYMBOLS[value]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
