"use client";

import { useEffect, useState } from "react";

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export default function IosInstallNotice() {
  const [ios, setIos] = useState<boolean | null>(null);

  useEffect(() => {
    setIos(isIosDevice());
  }, []);

  if (ios === null) return null;

  if (ios) {
    return (
      <p className="text-[11px] text-klir-ink/50 leading-relaxed">
        Ouvrez le profil dans <strong>Safari</strong>, puis Réglages → Profil téléchargé →
        Installer. Alternative : Partager → Sur l&apos;écran d&apos;accueil.
      </p>
    );
  }

  return (
    <div
      role="note"
      className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed"
    >
      <strong>Installation iOS uniquement.</strong> Sur ordinateur, le fichier{" "}
      <code className="text-[11px]">.mobileconfig</code> s&apos;affiche en XML — c&apos;est normal.
      Ouvrez cette page dans <strong>Safari sur iPhone ou iPad</strong>, ou ajoutez Klir IA via
      Partager → Sur l&apos;écran d&apos;accueil.
    </div>
  );
}
