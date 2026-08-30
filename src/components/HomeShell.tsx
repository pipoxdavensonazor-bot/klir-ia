"use client";

import { useState } from "react";
import AuthButtons from "@/components/AuthButtons";
import CreditBadge from "@/components/CreditBadge";
import ChatWorkspace from "@/components/ChatWorkspace";
import KlirLogo from "@/components/KlirLogo";
import { useCreditConfig } from "@/hooks/useCreditConfig";
import { FEATURED_SKILLS, type ActiveSkillId } from "@/lib/featured-skills";

export default function HomeShell() {
  const [activeSkill, setActiveSkill] = useState<ActiveSkillId>(null);
  const credit = useCreditConfig();

  return (
    <div className="site-shell h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden overscroll-none">
      <header className="shrink-0 border-b border-klir-primary/10 bg-white/90 backdrop-blur-md z-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-3 sm:gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0 group">
            <KlirLogo size={32} priority />
            <span className="font-display font-semibold text-klir-primary tracking-tight text-sm sm:text-base group-hover:text-klir-dark transition">
              Klir IA
            </span>
          </a>

          <label className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-none sm:max-w-[11rem]">
            <span className="text-[11px] uppercase tracking-wide text-klir-ink/45 font-semibold shrink-0">
              Skill
            </span>
            <select
              value={activeSkill ?? ""}
              onChange={(e) => setActiveSkill(e.target.value || null)}
              aria-label="Skill marketing"
              className="w-full min-w-0 rounded-lg border border-klir-primary/20 bg-white px-2 py-1.5 text-xs sm:text-sm text-klir-primary font-medium focus:outline-none focus:ring-2 focus:ring-klir-primary/25"
            >
              <option value="">Auto</option>
              {FEATURED_SKILLS.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="ml-auto flex items-center gap-3 sm:gap-4 shrink-0">
            <nav className="hidden md:flex gap-4 text-xs text-klir-ink/55">
              <a href="/studio/site" className="hover:text-klir-primary transition">
                Créer un site
              </a>
              <a href="/pricing" className="hover:text-klir-primary transition">
                Forfaits
              </a>
              <a href="/install" className="hover:text-klir-primary transition">
                Installer l’app
              </a>
              <a href="https://www.klirline.ca" className="hover:text-klir-primary transition">
                klirline.ca
              </a>
              <a href="https://klirline.app" className="hover:text-klir-primary transition">
                klirline.app
              </a>
            </nav>
            <a
              href="/studio/site"
              className="md:hidden text-xs text-klir-ink/55 hover:text-klir-primary"
            >
              Site
            </a>
            <a
              href="/pricing"
              className="md:hidden text-xs text-klir-ink/55 hover:text-klir-primary"
            >
              Forfaits
            </a>
            <a
              href="/install"
              className="md:hidden text-xs text-klir-ink/55 hover:text-klir-primary"
            >
              App
            </a>
            <CreditBadge />
            <AuthButtons />
          </div>
        </div>
      </header>

      <section className="hidden sm:block shrink-0 max-w-5xl w-full mx-auto px-4 pt-4 pb-3 text-center">
        <p className="font-display text-2xl sm:text-3xl font-bold text-klir-primary tracking-tight leading-tight">
          Klir IA
        </p>
        <p className="mt-1 text-sm text-klir-ink/65 max-w-md mx-auto leading-snug">
          Assistant marketing — copy, social, SEO, emails.
        </p>
      </section>

      <section
        id="chat"
        className="flex-1 min-h-0 max-w-4xl w-full mx-auto px-3 sm:px-4 pb-3 flex flex-col"
      >
        <div className="flex-1 min-h-0 bg-white border border-klir-primary/15 overflow-hidden flex flex-col rounded-xl sm:rounded-2xl shadow-[0_12px_40px_-24px_rgba(0,79,110,0.4)]">
          <ChatWorkspace activeSkill={activeSkill} onActiveSkillChange={setActiveSkill} />
        </div>
        <p className="shrink-0 text-center text-[11px] text-klir-ink/40 mt-2">
          {credit.registrationLabel} ·{" "}
          <a href="/pricing" className="underline underline-offset-2 hover:text-klir-primary">
            Recharger
          </a>
        </p>
      </section>

      <footer className="shrink-0 border-t border-klir-primary/10 hidden sm:block">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-klir-ink/45">
          <p>
            <span className="text-klir-primary font-medium">01</span> Décrire ·{" "}
            <span className="text-klir-primary font-medium">02</span> Skill ·{" "}
            <span className="text-klir-primary font-medium">03</span> Livrable
          </p>
          <p className="flex flex-wrap gap-x-3">
            <a href="https://www.klirline.ca" className="hover:text-klir-primary">
              klirline.ca
            </a>
            <a href="https://klirline.app" className="hover:text-klir-primary">
              klirline.app
            </a>
            <span>© {new Date().getFullYear()} Klirline Inc.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
