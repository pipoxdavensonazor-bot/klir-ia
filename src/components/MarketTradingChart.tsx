"use client";

import { useState } from "react";
import { Download, ImageIcon, Loader2 } from "lucide-react";
import TradingViewChart from "@/components/TradingViewChart";
import { downloadSnapshotJpeg, downloadSnapshotPng } from "@/lib/market/chart-export";
import type { MarketSnapshot } from "@/lib/market/types";

type Props = {
  symbol: string;
  snapshot: MarketSnapshot;
  height?: number;
};

export default function MarketTradingChart({ symbol, snapshot, height = 360 }: Props) {
  const [exporting, setExporting] = useState<"png" | "jpeg" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport(format: "png" | "jpeg") {
    setExporting(format);
    setExportError(null);
    try {
      if (format === "png") await downloadSnapshotPng(snapshot);
      else await downloadSnapshotJpeg(snapshot);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export échoué.");
    } finally {
      setExporting(null);
    }
  }

  const btn =
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-klir-primary/20 bg-white/80 text-klir-primary hover:bg-klir-primary/5 transition disabled:opacity-50";

  return (
    <div className="space-y-2">
      <TradingViewChart symbol={symbol} height={height} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btn}
          disabled={exporting != null}
          onClick={() => void handleExport("png")}
        >
          {exporting === "png" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Télécharger PNG
        </button>
        <button
          type="button"
          className={btn}
          disabled={exporting != null}
          onClick={() => void handleExport("jpeg")}
        >
          {exporting === "jpeg" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5" />
          )}
          Télécharger JPEG
        </button>
        <span className="text-[10px] text-klir-ink/45">
          Export 680×320 · style TradingView · données live
        </span>
      </div>
      {exportError ? <p className="text-[11px] text-red-500">{exportError}</p> : null}
    </div>
  );
}
