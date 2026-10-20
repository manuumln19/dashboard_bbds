import React from "react";
import ReactDOM from "react-dom/client";
import "./fonts.css";
import "./styles.css";
import "./views.css";
import "./almanaque.css";
import "./features.css";
import App from "./App";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Si el WebView no permite service workers, la app sigue funcionando.
    });
  });
}

if (!import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
