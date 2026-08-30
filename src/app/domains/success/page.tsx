import Link from "next/link";

type Props = { searchParams: Promise<{ order?: string }> };

export default async function DomainSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <h1 className="font-display text-2xl font-bold text-klir-primary">Domaine commandé</h1>
      <p className="text-sm text-klir-ink/65">
        Paiement reçu. Enregistrement et DNS sous 24–48 h ouvrables — courriel de confirmation à venir.
      </p>
      {order && <p className="text-xs text-klir-ink/40">Commande {order}</p>}
      <Link href="/domains" className="inline-block text-klir-primary font-medium underline">
        Mes domaines
      </Link>
    </div>
  );
}
