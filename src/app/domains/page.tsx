import DomainSearchPage from "@/components/DomainSearchPage";
import SiteHeader from "@/components/SiteHeader";

export const metadata = {
  title: "Domaines — Klir IA",
  description: "Recherchez et achetez un nom de domaine via Klirline.",
};

export default function DomainsPage() {
  return (
    <div className="site-shell min-h-screen flex flex-col">
      <SiteHeader active="domains" />
      <main className="flex-1">
        <DomainSearchPage />
      </main>
    </div>
  );
}
