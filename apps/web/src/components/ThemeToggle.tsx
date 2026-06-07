import { useEffect, useRef, useState } from "react";
import "./ThemeToggle.css";

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
const OPTIONS: Pref[] = ["system", "light", "dark"];

type Props = {
  labels: { legend: string; system: string; light: string; dark: string };
};

export default function ThemeToggle({ labels }: Props) {
  const [pref, setPref] = useState<Pref>("system");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
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

  const update = (next: Pref) => {
    setPref(next);
    setOpen(false);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyPref(next);
  };

  return (
    <div className="theme-control">
      {/* Expanded sidebar: inline circular toggle */}
      <fieldset className="ui-theme-toggle" aria-label={labels.legend}>
        <legend>{labels.legend}</legend>
        {OPTIONS.map((value) => (
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

      {/* Collapsed sidebar: dropdown (mirrors the language switcher) */}
      <div className="theme-dropdown" ref={dropdownRef}>
        <button
          type="button"
          className="theme-trigger"
          aria-label={labels.legend}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true">{SYMBOLS[pref]}</span>
        </button>
        {open && (
          <div className="theme-menu" role="listbox" aria-label={labels.legend}>
            {OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={pref === value}
                className={pref === value ? "is-active" : ""}
                onClick={() => update(value)}
              >
                <span className="sym" aria-hidden="true">
                  {SYMBOLS[value]}
                </span>
                <span className="name">{labels[value]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
