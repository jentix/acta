import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppShell } from "./App";
import "./styles.css";

const rootNode = document.getElementById("root");

if (!rootNode) {
  throw new Error('Missing root element with id "root"');
}

createRoot(rootNode).render(
  <StrictMode>
    <AppShell />
  </StrictMode>
);
