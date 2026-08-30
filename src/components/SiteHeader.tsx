import AuthButtons from "@/components/AuthButtons";
import CreditBadge from "@/components/CreditBadge";
import KlirLogo from "@/components/KlirLogo";

export type SiteNav = "chat" | "pricing" | "studio" | "svg" | "domains" | "developers" | "dashboard";

type Props = {
  active?: SiteNav;
  maxWidth?: "3xl" | "5xl";
};

const linkClass = (isActive: boolean) =>
  isActive
    ? "text-klir-primary font-medium"
    : "text-klir-ink/60 hover:text-klir-primary transition";

export default function SiteHeader({ active, maxWidth = "5xl" }: Props) {
  const max = maxWidth === "3xl" ? "max-w-3xl" : "max-w-5xl";

  return (
    <header className="border-b border-klir-primary/10 bg-white/70 backdrop-blur-md sticky top-0 z-20">
      <div className={`${max} mx-auto px-4 py-3.5 flex items-center justify-between gap-3`}>
        <a href="/" className="flex items-center gap-2.5 group shrink-0">
          <KlirLogo size={36} priority />
          <span className="font-display font-semibold text-klir-primary tracking-tight group-hover:text-klir-dark transition">
            Klir IA
          </span>
        </a>

        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <nav className="hidden sm:flex gap-5 text-sm">
            <a href="/#chat" className={linkClass(active === "chat")}>
              Chat
            </a>
            <a href="/pricing" className={linkClass(active === "pricing")}>
              Forfaits
            </a>
            <a href="/studio/site" className={linkClass(active === "studio")}>
              Site
            </a>
            <a href="/studio/svg" className={linkClass(active === "svg")}>
              SVG
            </a>
            <a href="/dashboard/sites" className={linkClass(active === "dashboard")}>
              Mes sites
            </a>
            <a href="/domains" className={linkClass(active === "domains")}>
              Domaines
            </a>
            <a href="/developers" className={linkClass(active === "developers")}>
              API
            </a>
            <a href="/install" className={linkClass(false)}>
              App
            </a>
          </nav>

          <nav className="sm:hidden flex items-center gap-2 text-[11px] text-klir-ink/55 overflow-x-auto">
            <a href="/#chat" className="whitespace-nowrap hover:text-klir-primary">
              Chat
            </a>
            <a href="/pricing" className="whitespace-nowrap hover:text-klir-primary">
              Forfaits
            </a>
            <a href="/studio/site" className="whitespace-nowrap hover:text-klir-primary">
              Site
            </a>
            <a href="/studio/svg" className="whitespace-nowrap hover:text-klir-primary">
              SVG
            </a>
            <a href="/domains" className="whitespace-nowrap hover:text-klir-primary">
              Domaines
            </a>
            <a href="/install" className="whitespace-nowrap hover:text-klir-primary">
              App
            </a>
          </nav>

          <CreditBadge />
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
