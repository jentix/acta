import { useEffect, useState } from "react";

const STORAGE_KEY = "acta-sidebar";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "collapsed";
}

function applyCollapsed(collapsed: boolean): void {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
}

export default function SidebarToggle() {
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
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={collapsed}
      onClick={toggle}
    >
      <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
    </button>
  );
}
