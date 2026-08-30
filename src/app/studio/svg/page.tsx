import SiteHeader from "@/components/SiteHeader";
import SvgVisualStudio from "@/components/SvgVisualStudio";

export const metadata = {
  title: "SVG Visual Studio — Klir IA",
  description:
    "Éditeur SVG/XML avec aperçu live, export PNG/SVG et assistance IA pour analyses graphiques.",
};

export default function StudioSvgPage() {
  return (
    <div className="site-shell min-h-screen flex flex-col bg-[#0d1117]">
      <SiteHeader active="svg" maxWidth="5xl" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <SvgVisualStudio />
      </main>

      <footer className="border-t border-white/5 py-4 text-center text-[11px] text-slate-500">
        <a href="/studio/site" className="hover:text-[#D4AF37] transition">
          Studio site
        </a>
        {" · "}
        <a href="/#chat" className="hover:text-[#D4AF37] transition">
          Chat Klir IA
        </a>
      </footer>
    </div>
  );
}
