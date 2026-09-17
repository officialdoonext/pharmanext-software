"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isUpdating: boolean;
  isIOS: boolean;
  installPWA: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  isUpdating: false,
  isIOS: false,
  installPWA: async () => "unavailable",
});

export function usePWA() {
  return useContext(PWAContext);
}

// BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect if already installed / standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    // 2. Detect iOS environment (for manual install guidance)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIosDevice);

    // 3. Listen for browser install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 4. Register Service Worker with Auto-Update Mechanism
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Check for updates on page load
          registration.update().catch(() => {});

          // Handle update found
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed") {
                // If there's an existing controller, a new deployment happened
                if (navigator.serviceWorker.controller) {
                  setIsUpdating(true);
                  // Tell new service worker to skip waiting and activate
                  installingWorker.postMessage({ type: "SKIP_WAITING" });
                }
              }
            };
          };

          // Periodic background check for new deployments (every 15 minutes)
          const updateInterval = setInterval(() => {
            registration.update().catch(() => {});
          }, 15 * 60 * 1000);

          // Check for updates when user returns to the app tab/window
          const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
              registration.update().catch(() => {});
            }
          };

          const handleOnline = () => {
            registration.update().catch(() => {});
          };

          document.addEventListener("visibilitychange", handleVisibilityChange);
          window.addEventListener("online", handleOnline);

          return () => {
            clearInterval(updateInterval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("online", handleOnline);
          };
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration error:", err);
        });

      // Reload smoothly when new controller takes over
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };

      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      };
    }
  }, []);

  // Programmatic Install Action
  const installPWA = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) {
      return "unavailable";
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return "accepted";
      } else {
        return "dismissed";
      }
    } catch (err) {
      console.error("Error showing PWA install prompt:", err);
      return "unavailable";
    }
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider value={{ isInstallable, isInstalled, isUpdating, isIOS, installPWA }}>
      {children}

      {/* Auto-Updating Banner Toast when a new deployment is activated */}
      {isUpdating && (
        <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-50 p-3 rounded-2xl bg-[#5E2B9D] text-white shadow-2xl border border-purple-300/30 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">New Update Available</div>
              <div className="text-[10px] text-purple-200 truncate">
                Applying latest PharmaNext release...
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg bg-white text-[#5E2B9D] text-xs font-medium hover:bg-purple-50 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            Refresh Now
          </button>
        </div>
      )}
    </PWAContext.Provider>
  );
}
