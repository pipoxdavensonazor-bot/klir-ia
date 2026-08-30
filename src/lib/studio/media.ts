import { readEnv } from "@/lib/env";

export type StockPhoto = {
  id: string;
  provider: "unsplash" | "pexels";
  url: string;
  thumb: string;
  alt: string;
  attribution: string;
  attributionUrl: string;
};

export async function searchStockPhotos(query: string, limit = 8): Promise<StockPhoto[]> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];

  const unsplash = await searchUnsplash(q, limit);
  if (unsplash.length) return unsplash;

  return searchPexels(q, limit);
}

async function searchUnsplash(q: string, limit: number): Promise<StockPhoto[]> {
  const key = readEnv("UNSPLASH_ACCESS_KEY");
  if (!key) return [];
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${limit}&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        id: string;
        alt_description?: string | null;
        description?: string | null;
        urls?: { regular?: string; small?: string };
        user?: { name?: string; links?: { html?: string } };
        links?: { html?: string };
      }>;
    };
    return (data.results ?? []).map((p) => ({
      id: `unsplash_${p.id}`,
      provider: "unsplash" as const,
      url: p.urls?.regular || p.urls?.small || "",
      thumb: p.urls?.small || p.urls?.regular || "",
      alt: p.alt_description || p.description || q,
      attribution: `Photo : ${p.user?.name || "Unsplash"} / Unsplash`,
      attributionUrl: p.user?.links?.html || p.links?.html || "https://unsplash.com",
    })).filter((p) => p.url);
  } catch {
    return [];
  }
}

async function searchPexels(q: string, limit: number): Promise<StockPhoto[]> {
  const key = readEnv("PEXELS_API_KEY");
  if (!key) return [];
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${limit}&orientation=landscape`;
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      photos?: Array<{
        id: number;
        alt?: string;
        url?: string;
        photographer?: string;
        photographer_url?: string;
        src?: { large?: string; medium?: string };
      }>;
    };
    return (data.photos ?? []).map((p) => ({
      id: `pexels_${p.id}`,
      provider: "pexels" as const,
      url: p.src?.large || p.src?.medium || "",
      thumb: p.src?.medium || p.src?.large || "",
      alt: p.alt || q,
      attribution: `Photo : ${p.photographer || "Pexels"} / Pexels`,
      attributionUrl: p.photographer_url || p.url || "https://www.pexels.com",
    })).filter((p) => p.url);
  } catch {
    return [];
  }
}
