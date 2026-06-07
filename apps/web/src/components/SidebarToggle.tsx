import { useEffect, useState } from "react";
import "./SidebarToggle.css";

const STORAGE_KEY = "acta-sidebar";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "collapsed";
}

function applyCollapsed(collapsed: boolean): void {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
}

type Props = { labels: { collapse: string; expand: string } };

export default function SidebarToggle({ labels }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const initial = readCollapsed();
    setCollapsed(initial);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
    applyCollapsed(next);
  };

  return (
    <button
      type="button"
      className="ui-sidebar-toggle"
      aria-label={collapsed ? labels.expand : labels.collapse}
      aria-pressed={collapsed}
      onClick={toggle}
    >
      <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
    </button>
  );
}
