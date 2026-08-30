"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

const DISMISS_KEY = "klir_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
}

function platform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && "ontouchend" in document)) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export default function PwaInstall() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [kind, setKind] = useState<"ios" | "android" | "desktop">("desktop");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && /\.sites\.klirline\.io$/i.test(window.location.hostname)) {
      return;
    }
    void navigator.serviceWorker?.register("/sw.js", { scope: "/" });
    if (isStandalone()) return;

    setKind(platform());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }

    const t = dismissed ? 0 : window.setTimeout(() => setOpen(true), 900);

    return () => {
      if (t) window.clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const close = useCallback((remember: boolean) => {
    setOpen(false);
    if (remember) {
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, []);

  const installChrome = useCallback(async () => {
    if (!deferred) {
      window.location.href = "/install";
      return;
    }
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      close(true);
    } finally {
      setBusy(false);
    }
  }, [close, deferred]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-labelledby="pwa-install-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-klir-primary/15 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-96.png" alt="" width={48} height={48} className="rounded-xl" />
            <div>
              <p id="pwa-install-title" className="font-display font-semibold text-klir-primary text-lg">
                Installer Klir IA ?
              </p>
              <p className="text-xs text-klir-ink/60">Sur téléphone, tablette ou Chrome — sans Play Store ni App Store.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => close(false)}
            className="text-klir-ink/40 hover:text-klir-ink"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {kind === "ios" ? (
          <ol className="text-sm text-klir-ink/80 space-y-1.5 list-decimal pl-5 leading-relaxed">
            <li>
              Touchez <strong>Partager</strong> (carré avec flèche) dans Safari
            </li>
            <li>
              Choisissez <strong>Sur l’écran d’accueil</strong>
            </li>
            <li>
              Ou téléchargez le profil iOS en un tap
            </li>
          </ol>
        ) : (
          <p className="text-sm text-klir-ink/75 leading-relaxed">
            {kind === "android"
              ? "Ajoutez Klir IA à l’écran d’accueil, ou téléchargez l’APK pour une installation directe."
              : "Installez l’app dans Chrome (icône Klir IA dans la barre d’adresse) pour l’ouvrir comme un logiciel."}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {kind === "ios" ? (
            <a
              href="/downloads/klir-ia.mobileconfig"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#004F6E] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#003548]"
            >
              <Smartphone className="w-4 h-4" />
              Installer sur iPhone / iPad
            </a>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void installChrome()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#004F6E] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#003548] disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {deferred ? "Installer maintenant" : "Voir le téléchargement"}
            </button>
          )}
          <a
            href="/install"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-klir-primary/20 text-klir-primary px-4 py-2.5 text-sm font-medium hover:bg-klir-primary/5"
          >
            Android APK / iOS
          </a>
        </div>

        <button
          type="button"
          onClick={() => close(true)}
          className="text-xs text-klir-ink/45 hover:text-klir-ink/70"
        >
          Ne plus afficher
        </button>
      </div>
    </div>
  );
}
