/**
 * Revendeur domaines Klirline — partenaire wholesale recommandé : OpenSRS (Tucows).
 * Alternatives : Namecheap Reseller API, Porkbun Partner API.
 *
 * Variables Worker :
 * - REGISTRAR_PROVIDER=opensrs|namecheap|manual
 * - OPENSRS_USERNAME, OPENSRS_API_KEY, OPENSRS_TEST (true|false)
 * - NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_CLIENT_IP
 *
 * Doc OpenSRS : https://domains.opensrs.guide/docs/quickstart
 */

import { readEnv } from "@/lib/env";
import {
  getOpenSrsConfig,
  registerOpenSrsDomain,
  type OpenSrsContact,
} from "@/lib/domains/opensrs-xcp";

export type RegistrarStatus = "registered" | "pending_manual" | "failed";

export type RegisterDomainInput = {
  domain: string;
  userId: string;
  paymentOrderId: string;
};

export type RegisterDomainResult = {
  ok: boolean;
  status: RegistrarStatus;
  registrarRef?: string;
  provider: string;
  message?: string;
};

export function registrarProvider(): string {
  return readEnv("REGISTRAR_PROVIDER") || "manual";
}

export function registrarConfigured(): boolean {
  const p = registrarProvider();
  if (p === "opensrs") {
    return Boolean(getOpenSrsConfig());
  }
  if (p === "namecheap") {
    return Boolean(
      readEnv("NAMECHEAP_API_USER") &&
        readEnv("NAMECHEAP_API_KEY") &&
        readEnv("NAMECHEAP_CLIENT_IP")
    );
  }
  return false;
}

/** Enregistre le domaine chez le partenaire wholesale ou file manuelle. */
export async function registerDomainWithRegistrar(
  input: RegisterDomainInput
): Promise<RegisterDomainResult> {
  const provider = registrarProvider();

  if (provider === "opensrs" && registrarConfigured()) {
    return registerOpenSrs(input);
  }
  if (provider === "namecheap" && registrarConfigured()) {
    return registerNamecheap(input);
  }

  return {
    ok: true,
    status: "pending_manual",
    provider: "manual",
    registrarRef: `manual:${input.paymentOrderId}`,
    message:
      "Commande reçue — enregistrement sous 24–48 h. Configurez REGISTRAR_PROVIDER=opensrs pour l'automatisation.",
  };
}

async function registerOpenSrs(input: RegisterDomainInput): Promise<RegisterDomainResult> {
  const config = getOpenSrsConfig();
  if (!config) {
    return { ok: false, status: "failed", provider: "opensrs", message: "OpenSRS non configuré." };
  }

  const test = readEnv("OPENSRS_TEST") === "true";

  try {
    const contact = placeholderContact(input.userId);
    const reply = await registerOpenSrsDomain({
      config,
      domain: input.domain,
      userId: input.userId,
      contact,
    });

    if (reply.isSuccess) {
      const domainId = reply.attributes.domain_id ?? reply.attributes.id;
      return {
        ok: true,
        status: "registered",
        provider: "opensrs",
        registrarRef: domainId ? `opensrs:${domainId}` : `opensrs:${input.domain}`,
        message: test ? "Enregistrement sandbox OpenSRS." : reply.responseText ?? undefined,
      };
    }

    const code = reply.responseCode ?? "unknown";
    const text = reply.responseText ?? "Échec OpenSRS.";
    const retryable = code.startsWith("4") || code === "555" || text.toLowerCase().includes("timeout");

    return {
      ok: false,
      status: retryable ? "pending_manual" : "failed",
      provider: "opensrs",
      registrarRef: retryable ? `opensrs-pending:${input.paymentOrderId}` : undefined,
      message: `[${code}] ${text}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: "pending_manual",
      provider: "opensrs",
      registrarRef: `opensrs-pending:${input.paymentOrderId}`,
      message: err instanceof Error ? err.message : "Erreur OpenSRS — traitement manuel.",
    };
  }
}

async function registerNamecheap(input: RegisterDomainInput): Promise<RegisterDomainResult> {
  const apiUser = readEnv("NAMECHEAP_API_USER");
  const apiKey = readEnv("NAMECHEAP_API_KEY");
  const clientIp = readEnv("NAMECHEAP_CLIENT_IP");
  const sandbox = readEnv("NAMECHEAP_SANDBOX") === "true";

  if (!apiUser || !apiKey || !clientIp) {
    return { ok: false, status: "failed", provider: "namecheap", message: "Namecheap non configuré." };
  }

  const [sld, tld] = splitDomain(input.domain);
  const base = sandbox
    ? "https://api.sandbox.namecheap.com/xml.response"
    : "https://api.namecheap.com/xml.response";

  try {
    const params = new URLSearchParams({
      ApiUser: apiUser,
      ApiKey: apiKey,
      UserName: apiUser,
      ClientIp: clientIp,
      Command: "namecheap.domains.create",
      DomainName: input.domain,
      Years: "1",
      SLD: sld,
      TLD: tld,
    });

    const res = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(25_000) });
    const text = await res.text();
    const ok = /Status="OK"/i.test(text) || /DomainCreated/i.test(text);

    if (!ok) {
      return {
        ok: false,
        status: "pending_manual",
        provider: "namecheap",
        registrarRef: `nc-pending:${input.paymentOrderId}`,
        message: text.slice(0, 240) || "Namecheap a refusé — file manuelle.",
      };
    }

    const idMatch = text.match(/DomainID="(\d+)"/i);
    return {
      ok: true,
      status: "registered",
      provider: "namecheap",
      registrarRef: idMatch?.[1] ? `nc:${idMatch[1]}` : `nc:${input.domain}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: "pending_manual",
      provider: "namecheap",
      registrarRef: `nc-pending:${input.paymentOrderId}`,
      message: err instanceof Error ? err.message : "Erreur Namecheap.",
    };
  }
}

function splitDomain(domain: string): [string, string] {
  const parts = domain.split(".");
  const tld = parts.pop() ?? "com";
  return [parts.join(".") || domain, tld];
}

function placeholderContact(userId: string): OpenSrsContact {
  return {
    first_name: "Klirline",
    last_name: "Client",
    org_name: "Klirline Inc",
    address1: "Port-au-Prince",
    city: "Port-au-Prince",
    state: "OU",
    country: "HT",
    postal_code: "00000",
    phone: "+509.37000000",
    email: `domains+${userId.slice(0, 12)}@klirline.io`,
  };
}

export function recommendedRegistrarNote(): string {
  return "OpenSRS (revendeur) est optionnel — pas de dépôt requis. Mode manuel par défaut. Option la moins chère pour vos clients : *.sites.klirline.io (500 HTG / 30 j).";
}
