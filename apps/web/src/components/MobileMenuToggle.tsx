import { useEffect, useState } from "react";
import "./MobileMenuToggle.css";

type Props = { labels: { open: string; close: string } };

export default function MobileMenuToggle({ labels }: Props) {
  const [open, setOpen] = useState(false);

  // Reflect open state onto <html> (drives the drawer + backdrop via CSS)
  // and lock body scroll while the drawer is open.
  useEffect(() => {
    document.documentElement.dataset.mobileNav = open ? "open" : "closed";
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-close when leaving the mobile breakpoint (e.g. rotate to landscape)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 861px)");
    const handler = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        className="mobile-burger"
        aria-label={open ? labels.close : labels.open}
        aria-expanded={open}
        aria-controls="app-sidebar"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="mobile-burger__lines" aria-hidden="true"></span>
      </button>
      <div className="mobile-backdrop" aria-hidden="true" onClick={() => setOpen(false)}></div>
    </>
  );
}
