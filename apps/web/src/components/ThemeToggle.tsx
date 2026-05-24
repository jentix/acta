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

const OPTIONS: { value: Pref; label: string; symbol: string }[] = [
  { value: "system", label: "System", symbol: "◐" },
  { value: "light", label: "Light", symbol: "☀" },
  { value: "dark", label: "Dark", symbol: "☾" },
];

export default function ThemeToggle() {
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

  return (
    <fieldset className="ui-theme-toggle" aria-label="Theme">
      <legend>Theme</legend>
      {OPTIONS.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name="acta-theme"
            value={option.value}
            checked={pref === option.value}
            onChange={() => update(option.value)}
          />
          <span title={option.label}>
            <span className="sr-only">{option.label}</span>
            <span aria-hidden="true">{option.symbol}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
