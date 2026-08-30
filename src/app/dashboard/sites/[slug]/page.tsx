import SiteHeader from "@/components/SiteHeader";
import SiteOwnerDashboard from "@/components/SiteOwnerDashboard";

type Props = { params: Promise<{ slug: string }> };

export default async function SiteAdminPage({ params }: Props) {
  const { slug } = await params;
  return (
    <>
      <SiteHeader active="studio" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <SiteOwnerDashboard slug={slug} />
      </main>
    </>
  );
}
