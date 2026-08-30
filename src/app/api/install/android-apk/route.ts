import { NextResponse } from "next/server";

const PWABUILDER_APK = "https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage";

const ANDROID_OPTIONS = {
  name: "Klir IA",
  launcherName: "Klir IA",
  packageId: "io.klirline.app",
  host: "https://klirline.io",
  startUrl: "/?source=apk",
  iconUrl: "https://klirline.io/icons/icon-512.png",
  webManifestUrl: "https://klirline.io/manifest.webmanifest",
  appVersion: "1.0.0",
  appVersionCode: 1,
  display: "standalone",
  orientation: "default",
  themeColor: "#004F6E",
  themeColorDark: "#003548",
  navigationColor: "#004F6E",
  navigationColorDark: "#003548",
  navigationDividerColor: "#004F6E",
  navigationDividerColorDark: "#003548",
  backgroundColor: "#F0F7F8",
  enableNotifications: false,
  enableSiteSettingsShortcut: true,
  isChromeOSOnly: false,
  isMetaQuest: false,
  fallbackType: "customtabs",
  features: {
    locationDelegation: { enabled: false },
    playBilling: { enabled: false },
  },
  shortcuts: [
    { name: "Chat", short_name: "Chat", url: "/#chat", icons: [] },
  ],
  signingMode: "none",
  signing: null,
  splashScreenFadeOutDuration: 300,
  includeSourceCode: false,
  additionalTrustedOrigins: ["https://www.klirline.io"],
};

/** Génère (ou relaie) l’APK Android TWA — sideload sans Play Store. */
export async function GET() {
  try {
    const res = await fetch(PWABUILDER_APK, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/zip" },
      body: JSON.stringify(ANDROID_OPTIONS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error:
            "APK en préparation. En attendant, installez via Chrome : menu ⋮ → Installer l’application.",
          detail: detail.slice(0, 400),
          chromeInstall: "https://klirline.io/install",
        },
        { status: 503 }
      );
    }

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="klir-ia-android.zip"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Téléchargement APK indisponible. Installez via Chrome (⋮ → Installer l’application) — sans Play Store.",
      },
      { status: 503 }
    );
  }
}
