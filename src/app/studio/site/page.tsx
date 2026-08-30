import SiteHeader from "@/components/SiteHeader";
import SiteWizard from "@/components/SiteWizard";

export const metadata = {
  title: "Créer un site — Klir IA",
  description: "Wizard guidé pour générer une landing page HTML en quelques questions.",
};

export default function StudioSitePage() {
  return (
    <div className="site-shell min-h-screen flex flex-col">
      <SiteHeader active="studio" maxWidth="3xl" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <p className="font-display text-3xl font-bold text-klir-primary">Studio site web</p>
          <p className="mt-2 text-sm text-klir-ink/60 max-w-lg mx-auto">
            6 templates HTML gratuits + personnalisation IA. Hero, galerie, partenaires — prêt à publier sur Klirline.
          </p>
          <p className="mt-3 text-sm">
            <a href="/studio/svg" className="text-klir-primary underline hover:text-klir-dark">
              SVG Visual Studio →
            </a>{" "}
            éditeur graphique live pour analyses trading et visuels réseaux sociaux.
          </p>
        </div>
        <SiteWizard />
      </main>
    </div>
  );
}
