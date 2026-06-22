import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./pdf/pdfReact";
import App from "./App";
import "./styles.css";
import "./theme-apple.css";
import "./sorbits-ui.css";
import "./spacework-theme.css";
import "./life/life-design-tokens.css";
import "./life/life-theme.css";
import "./today-shell.css";
import { initTheme, subscribeSystemTheme } from "./theme";

initTheme();
subscribeSystemTheme(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
