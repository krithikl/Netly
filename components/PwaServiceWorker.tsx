"use client";

import { useEffect } from "react";

// Registers the PWA service worker once the browser has loaded the app shell.
export function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      unregisterDevelopmentServiceWorkers();
      return;
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Netly service worker registration failed.", error);
      });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });

    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}

// Removes stale production PWA caches when localhost is running the dev server.
function unregisterDevelopmentServiceWorkers() {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch((error: unknown) => {
      console.error("Netly development service worker cleanup failed.", error);
    });

  if (!("caches" in window)) {
    return;
  }

  caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("netly-pwa-")).map((key) => caches.delete(key))))
    .catch((error: unknown) => {
      console.error("Netly development cache cleanup failed.", error);
    });
}
