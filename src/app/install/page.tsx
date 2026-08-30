import SiteHeader from "@/components/SiteHeader";
import IosInstallNotice from "@/components/IosInstallNotice";
import { Download, Monitor, Smartphone } from "lucide-react";

export const metadata = {
  title: "Installer Klir IA — Chrome, Android, iOS",
  description:
    "Installez Klir IA sur Chrome, téléchargez l’APK Android sans Play Store, ou ajoutez l’app sur iPhone sans App Store.",
};

export default function InstallPage() {
  return (
    <div className="site-shell min-h-screen flex flex-col bg-[#F4F7F8]">
      <SiteHeader maxWidth="5xl" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        <header className="text-center space-y-2">
          <p className="font-display text-3xl font-bold text-klir-primary tracking-tight">
            Télécharger Klir IA
          </p>
          <p className="text-sm text-klir-ink/65 max-w-lg mx-auto leading-relaxed">
            Installation rapide hors Play Store et App Store. Chrome propose aussi d’ajouter
            l’app dès que vous ouvrez klirline.io.
          </p>
        </header>

        <section className="grid sm:grid-cols-2 gap-4">
          <article className="rounded-2xl border border-klir-primary/15 bg-white p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-klir-primary font-display font-semibold">
              <Smartphone className="w-5 h-5" />
              Android — APK
            </div>
            <p className="text-sm text-klir-ink/70 leading-relaxed">
              Téléchargement direct, sans Google Play. Autorisez « sources inconnues » si
              Android le demande, puis ouvrez le fichier.
            </p>
            <a
              href="/api/install/android-apk"
              className="inline-flex items-center gap-2 rounded-xl bg-[#004F6E] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#003548]"
            >
              <Download className="w-4 h-4" />
              Télécharger l’APK
            </a>
            <p className="text-[11px] text-klir-ink/45 leading-relaxed">
              Alternative Chrome : menu ⋮ → <strong>Installer l’application</strong> (2
              secondes, pas de fichier).
            </p>
          </article>

          <article className="rounded-2xl border border-klir-primary/15 bg-white p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-klir-primary font-display font-semibold">
              <Smartphone className="w-5 h-5" />
              iPhone / iPad
            </div>
            <p className="text-sm text-klir-ink/70 leading-relaxed">
              Apple n’autorise pas un IPA public hors App Store. Le profil ci-dessous ajoute
              Klir IA plein écran sur l’accueil — même résultat, sans Apple.
            </p>
            <IosInstallNotice />
            <a
              href="/downloads/klir-ia.mobileconfig"
              className="inline-flex items-center gap-2 rounded-xl bg-[#004F6E] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#003548]"
            >
              <Download className="w-4 h-4" />
              Télécharger le profil iOS
            </a>
            <ol className="text-[11px] text-klir-ink/50 list-decimal pl-4 space-y-1 sm:hidden">
              <li>Safari → Partager → Sur l’écran d’accueil</li>
              <li>Ou ouvrez le profil → Réglages → Profil téléchargé → Installer</li>
            </ol>
          </article>
        </section>

        <article className="rounded-2xl border border-[#D4AF37]/30 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-klir-primary font-display font-semibold">
            <Monitor className="w-5 h-5" />
            Chrome (ordinateur)
          </div>
          <p className="text-sm text-klir-ink/70 leading-relaxed">
            Dans Chrome, cliquez l’icône d’installation dans la barre d’adresse (ordinateur +
            écran), ou menu ⋮ → <strong>Installer Klir IA</strong>. L’app s’ouvre ensuite
            comme une fenêtre autonome.
          </p>
        </article>
      </main>
    </div>
  );
}
