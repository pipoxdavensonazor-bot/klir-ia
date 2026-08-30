import Link from "next/link";

type Props = { searchParams: Promise<{ order?: string }> };

export default async function HostingSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <h1 className="font-display text-2xl font-bold text-klir-primary">Site publié</h1>
      <p className="text-sm text-klir-ink/65">
        Votre site est en ligne (30 jours). Votre compte admin est prêt — modifiez textes, photos et
        paiements depuis le tableau de bord.
      </p>
      {order && <p className="text-xs text-klir-ink/40">Commande {order}</p>}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          href="/dashboard/sites"
          className="inline-block px-5 py-2.5 rounded-xl bg-klir-primary text-white text-sm font-medium"
        >
          Ouvrir mon espace admin
        </Link>
        <Link href="/studio/site" className="inline-block text-klir-primary text-sm underline self-center">
          Créer un autre site
        </Link>
      </div>
    </div>
  );
}
