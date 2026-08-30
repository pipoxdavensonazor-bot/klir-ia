import AdminCreditsPanel from "@/components/AdminCreditsPanel";
import SiteHeader from "@/components/SiteHeader";
import { getAuthUser } from "@/lib/auth/server";
import { isKlirAdminEmail } from "@/lib/billing/credit-config";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin crédits — Klir IA",
};

export default async function AdminCreditsPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/sign-in?redirect_url=/dashboard/admin/credits");
  if (!isKlirAdminEmail(user.email)) {
    return (
      <div className="site-shell min-h-screen flex flex-col">
        <SiteHeader active="dashboard" />
        <main className="flex-1 max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-klir-primary font-semibold">Accès réservé</p>
          <p className="text-sm text-klir-ink/60 mt-2">
            Votre compte n&apos;est pas dans{" "}
            <code className="text-xs bg-klir-primary/5 px-1 rounded">KLIR_ADMIN_EMAILS</code>.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell min-h-screen flex flex-col">
      <SiteHeader active="dashboard" />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-14">
        <AdminCreditsPanel adminEmail={user.email} />
      </main>
    </div>
  );
}
