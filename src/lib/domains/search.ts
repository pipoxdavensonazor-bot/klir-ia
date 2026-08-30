import { listSupportedTlds, normalizeDomain } from "@/lib/billing/catalog";

export type DomainSearchResult = {
  domain: string;
  tld: string;
  available: boolean;
  priceHtg: number | null;
  priceUsd: number | null;
  reason?: string;
};

async function rdapAvailable(domain: string): Promise<boolean> {
  const tld = domain.split(".").pop() ?? "";
  const name = domain.split(".")[0];

  const endpoints: string[] = [];
  if (tld === "com" || tld === "net") {
    endpoints.push(`https://rdap.verisign.com/${tld}/v1/domain/${domain.toUpperCase()}`);
  }
  endpoints.push(`https://rdap.org/domain/${domain}`);

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/rdap+json, application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) return true;
      if (res.ok) return false;
    } catch {
      // try next endpoint
    }
  }
  return false;
}

export async function searchDomainAvailability(query: string): Promise<DomainSearchResult[]> {
  const normalized = normalizeDomain(query);
  if (!normalized) {
    throw new Error("Nom de domaine invalide.");
  }

  const parts = normalized.split(".");
  const hasTld = parts.length >= 2 && listSupportedTlds().includes(parts[parts.length - 1]);
  const baseName = hasTld ? parts.slice(0, -1).join(".") : normalized.replace(/\..+$/, "") || normalized;

  if (!baseName || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(baseName)) {
    throw new Error("Nom invalide (lettres, chiffres, tirets).");
  }

  const tlds = hasTld ? [parts[parts.length - 1]] : listSupportedTlds();
  const { getDomainProduct } = await import("@/lib/billing/catalog");

  const results: DomainSearchResult[] = [];
  for (const tld of tlds.slice(0, 6)) {
    const domain = `${baseName}.${tld}`;
    const product = getDomainProduct(domain);
    if (!product) continue;
    const available = await rdapAvailable(domain);
    results.push({
      domain,
      tld,
      available,
      priceHtg: product.htg,
      priceUsd: product.usd,
      reason: available ? undefined : "Domaine déjà enregistré",
    });
  }

  return results;
}
