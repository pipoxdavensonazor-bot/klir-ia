"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus, Trash2, Loader2 } from "lucide-react";

export type ConversationListItem = {
  id: string;
  title: string;
  skill: string | null;
  updated_at: number;
};

type Props = {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey?: number;
  className?: string;
};

export default function ConversationSidebar({
  activeId,
  onSelect,
  onNew,
  refreshKey = 0,
  className = "",
}: Props) {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/conversations")
      .then(async (r) => {
        if (!r.ok) throw new Error("fail");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setItems(data.conversations ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function remove(id: string) {
    if (!confirm("Supprimer cette conversation ?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setLoadError("Impossible de supprimer cette conversation.");
      return;
    }
    setItems((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) onNew();
  }

  return (
    <aside
      className={`w-56 shrink-0 border-r border-klir-primary/10 bg-klir-primary/[0.02] flex flex-col min-h-0 ${className}`}
    >
      <div className="p-3 border-b border-klir-primary/10">
        <button
          type="button"
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-klir-primary text-white hover:bg-klir-dark transition"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Nouvelle
        </button>
      </div>
      {loadError && (
        <p className="mx-2 mb-2 text-[11px] text-red-600 bg-red-50 rounded px-2 py-1">{loadError}</p>
      )}
      <div className="flex-1 overflow-y-auto chat-scroll p-2 space-y-1">
        {loading && (
          <div className="flex justify-center py-6 text-klir-ink/40">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className="text-[11px] text-klir-ink/45 px-2 py-4 leading-relaxed">
            Connecté : vos échanges seront sauvegardés ici.
          </p>
        )}
        {items.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-md ${
              activeId === c.id ? "bg-klir-primary/10" : "hover:bg-white/80"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className="flex-1 text-left text-xs px-2 py-2 truncate text-klir-primary"
              title={c.title}
            >
              {c.title || "Sans titre"}
            </button>
            <button
              type="button"
              onClick={() => void remove(c.id)}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-klir-ink/40 hover:text-red-600 transition"
              aria-label="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
