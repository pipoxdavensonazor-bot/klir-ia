export type ChatTurnMedia = {
  kind: "image" | "site" | "stock" | "market";
  url?: string;
  html?: string;
  title?: string;
  caption?: string;
  attribution?: string;
  attributionUrl?: string;
  downloadName?: string;
  hostingSteps?: string[];
  hostingUrl?: string;
  marketSnapshot?: {
    assetClass?: "crypto" | "forex" | "equity";
    symbol: string;
    name: string;
    priceUsd: number;
    currency?: string;
    change24hPct: number | null;
    change7dPct?: number | null;
    high24hUsd?: number | null;
    low24hUsd?: number | null;
    fearGreed?: { value: number; label: string } | null;
    source?: "coingecko" | "alphavantage" | "binance" | "frankfurter" | "coinbase";
  };
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  media?: ChatTurnMedia[];
  attachmentNames?: string[];
};

export type ChatResult = {
  content: string;
  model: string;
  provider: string;
  skill?: string;
};

export type SkillMeta = {
  name: string;
  description: string;
  category: string;
};

export type SkillDetail = SkillMeta & {
  body: string;
};
