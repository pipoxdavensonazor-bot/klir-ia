"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    TradingView?: {
      widget: (options: Record<string, unknown>) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTradingView(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-klir-tv="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("TradingView")));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.dataset.klirTv = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("TradingView indisponible"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

type Props = {
  symbol: string;
  height?: number;
  interval?: string;
  className?: string;
};

export default function TradingViewChart({
  symbol,
  height = 380,
  interval = "D",
  className = "",
}: Props) {
  const rawId = useId().replace(/:/g, "");
  const containerId = `tv_${rawId}`;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const node = document.getElementById(containerId);
    if (node) node.innerHTML = "";

    loadTradingView()
      .then(() => {
        if (!alive.current || !window.TradingView) return;
        window.TradingView.widget({
          autosize: true,
          symbol,
          interval,
          timezone: "America/Toronto",
          theme: "dark",
          style: "1",
          locale: "fr",
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          withdateranges: true,
          enabled_features: ["header_screenshot"],
          container_id: containerId,
        });
      })
      .catch(() => {
        if (!node) return;
        node.innerHTML =
          '<p style="padding:16px;color:#94a3b8;font:13px system-ui">Graphique TradingView indisponible.</p>';
      });

    return () => {
      alive.current = false;
    };
  }, [symbol, interval, containerId]);

  return (
    <div
      className={`relative rounded-lg border border-klir-primary/15 overflow-hidden bg-[#0B161D] ${className}`}
      style={{ height }}
    >
      <div className="absolute top-2 left-3 z-10 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
        TradingView
      </div>
      <div id={containerId} className="h-full w-full min-h-[280px]" />
    </div>
  );
}
