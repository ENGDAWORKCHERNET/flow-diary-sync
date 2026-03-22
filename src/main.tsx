import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { setSWRegistration } from "./lib/notifications";

registerSW({
  immediate: true,
  onRegistered(r) {
    if (r) setSWRegistration(r);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
