import AuthButtons from "@/components/AuthButtons";
import KlirLogo from "@/components/KlirLogo";

export default async function PricingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; pending?: string }>;
}) {
  const params = await searchParams;
  const pending = params.pending === "1";

  return (
    <div className="site-shell min-h-screen flex flex-col">
      <header className="border-b border-klir-primary/10 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5">
            <KlirLogo size={36} priority />
            <span className="font-display font-semibold text-klir-primary">Klir IA</span>
          </a>
          <AuthButtons />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-3xl font-bold text-klir-primary">
            {pending ? "Paiement en cours" : "Merci"}
          </h1>
          <p className="text-klir-ink/65 leading-relaxed">
            {pending
              ? "MonCash n’a pas encore confirmé. Votre forfait s’active dès validation."
              : "Votre forfait est actif. Retournez au chat ou créez une clé API sur /developers."}
          </p>
          {params.order && (
            <p className="text-xs text-klir-ink/40 font-mono">Réf. {params.order}</p>
          )}
          <a
            href="/#chat"
            className="inline-flex mt-4 px-6 py-3 rounded-xl bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark transition"
          >
            Retour au chat
          </a>
        </div>
      </main>
    </div>
  );
}
