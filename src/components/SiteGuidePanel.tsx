"use client";

type Props = {
  step?: number;
  context?: "wizard" | "dashboard";
};

const WIZARD_TIPS: Record<number, string> = {
  0: "Chaque template est mappé à un skill design Klir IA — lisez la description et le skill label avant de choisir.",
  1: "Le type détermine la structure : landing = conversion, boutique = ventes, portfolio = projets visibles.",
  2: "Nom + slogan apparaissent dans le hero, le partage WhatsApp et Google. Soyez précis et mémorable.",
  3: "Choisissez une catégorie proche ou précisez votre niche — cela oriente photos stock et ton du texte.",
  4: "Décrire votre audience aide à formuler les bénéfices et le CTA dans un langage qu'ils comprennent.",
  5: "Un objectif = un KPI : leads (contacts), ventes (commandes), inscription (RSVP), rendez-vous (booking).",
  6: "Hero + Bénéfices + Contact sont le minimum. Témoignages et tarifs augmentent la conversion.",
  7: "Corporate pour B2B, Chaleureux pour local, Luxe pour premium, Tech pour SaaS — le rendu s'adapte.",
  8: "Email, téléphone et WhatsApp seront réutilisables dans votre admin et vos futurs boutons de contact.",
  9: "Le CTA doit être verbe d'action : Réserver, Commander, Devis — pas « Cliquez ici ».",
  10: "Couleurs de marque + langue du site. Notes libres = concurrents, promos, contraintes légales.",
};

const DASHBOARD_TIPS = [
  "Remplacez les photos stock par vos vraies images — glissez une photo, puis cliquez « Utiliser comme hero ».",
  "Activez MonCash en Haïti, Stripe au Canada/US — vos clients paient comme sur Shopify.",
  "Votre site inclut boutons Partager et Copier lien — responsive mobile automatique.",
  "Besoin d'aide ? Ouvrez le chat Klir IA — je reste disponible pendant toute la création.",
];

export default function SiteGuidePanel({ step = 0, context = "wizard" }: Props) {
  const tip =
    context === "dashboard"
      ? DASHBOARD_TIPS[step % DASHBOARD_TIPS.length]
      : WIZARD_TIPS[step] ?? WIZARD_TIPS[0];

  return (
    <aside className="rounded-xl border border-klir-primary/15 bg-gradient-to-br from-klir-primary/5 to-klir-accent/10 p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-klir-primary/70">
        Klir IA — votre guide
      </p>
      <p className="text-sm text-klir-ink/75 leading-relaxed">{tip}</p>
      <a
        href="/#chat"
        className="inline-block text-xs font-medium text-klir-primary underline underline-offset-2"
      >
        Poser une question au chat →
      </a>
    </aside>
  );
}
