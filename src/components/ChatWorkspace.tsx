"use client";

import { useCallback, useState } from "react";
import { History, X } from "lucide-react";
import { useKlirAuth } from "@/components/AuthProvider";
import ChatPanel from "@/components/ChatPanel";
import ConversationSidebar from "@/components/ConversationSidebar";
import { useCreditConfig } from "@/hooks/useCreditConfig";
import type { ActiveSkillId } from "@/lib/featured-skills";

type Props = {
  activeSkill?: ActiveSkillId;
  onActiveSkillChange?: (skill: ActiveSkillId) => void;
};

export default function ChatWorkspace({ activeSkill = null, onActiveSkillChange }: Props) {
  const { isSignedIn, loading } = useKlirAuth();
  const credit = useCreditConfig();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const onNew = useCallback(() => {
    setConversationId(null);
    setSidebarOpen(false);
  }, []);

  const onSelect = useCallback((id: string) => {
    setConversationId(id);
    setSidebarOpen(false);
  }, []);

  const onConversationChange = useCallback((id: string | null) => {
    setConversationId(id);
    setRefreshKey((k) => k + 1);
  }, []);

  const showSidebar = isSignedIn && !loading;

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      {showSidebar && (
        <div className="hidden sm:flex shrink-0 min-h-0">
          <ConversationSidebar
            activeId={conversationId}
            onSelect={onSelect}
            onNew={onNew}
            refreshKey={refreshKey}
          />
        </div>
      )}

      {showSidebar && sidebarOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true" aria-label="Historique">
          <button
            type="button"
            className="absolute inset-0 bg-klir-ink/40"
            aria-label="Fermer l’historique"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[min(100%,16rem)] bg-white shadow-xl flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-klir-primary/10">
              <span className="text-sm font-semibold text-klir-primary">Historique</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-klir-ink/50 hover:text-klir-primary"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ConversationSidebar
              activeId={conversationId}
              onSelect={onSelect}
              onNew={onNew}
              refreshKey={refreshKey}
              className="flex-1 border-r-0 w-full"
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {showSidebar && (
          <div className="sm:hidden shrink-0 px-3 py-2 border-b border-klir-primary/10 bg-white/80">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-medium text-klir-primary px-3 py-1.5 rounded-lg border border-klir-primary/20 hover:bg-klir-primary/5"
            >
              <History className="w-3.5 h-3.5" />
              Historique
            </button>
          </div>
        )}
        <ChatPanel
          conversationId={conversationId}
          persistEnabled={Boolean(isSignedIn) && !loading}
          onConversationChange={onConversationChange}
          activeSkill={activeSkill}
          onActiveSkillChange={onActiveSkillChange}
        />
        {!isSignedIn && !loading && (
          <p className="shrink-0 text-[11px] text-center text-klir-ink/40 px-3 py-1.5 border-t border-klir-primary/10">
            Connectez-vous pour garder l’historique · {credit.registrationLabel}
          </p>
        )}
      </div>
    </div>
  );
}
