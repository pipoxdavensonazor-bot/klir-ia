/**
 * Client OpenSRS XCP (XML over HTTPS POST + signature MD5 double).
 * @see https://domains.opensrs.guide/docs/quickstart
 * @see https://domains.opensrs.guide/docs/construction-of-the-post-data
 */

import { createHash } from "node:crypto";
import { readEnv } from "@/lib/env";

export type OpenSrsContact = {
  first_name: string;
  last_name: string;
  org_name: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  fax?: string;
  address2?: string;
  address3?: string;
};

export type OpenSrsReply = {
  isSuccess: boolean;
  responseCode: string | null;
  responseText: string | null;
  attributes: Record<string, string>;
  raw: string;
};

export type OpenSrsConfig = {
  username: string;
  apiKey: string;
  host: string;
};

type XcpScalar = string | number;
type XcpAssoc = { [key: string]: XcpScalar | XcpAssoc | XcpAssoc[] };
type XcpNode = XcpScalar | XcpAssoc | XcpAssoc[];

export function getOpenSrsConfig(): OpenSrsConfig | null {
  const username = readEnv("OPENSRS_USERNAME");
  const apiKey = readEnv("OPENSRS_API_KEY");
  if (!username || !apiKey) return null;
  const test = readEnv("OPENSRS_TEST") === "true";
  return {
    username,
    apiKey,
    host: test ? "https://horizon.opensrs.net:55443" : "https://rr-n1-tor.opensrs.net:55443",
  };
}

function md5Hex(input: string): string {
  return createHash("md5").update(input, "utf8").digest("hex");
}

export function opensrsSignature(xml: string, apiKey: string): string {
  const first = md5Hex(xml + apiKey);
  return md5Hex(first + apiKey);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDtArray(items: XcpNode[], indent: string): string {
  return items
    .map((item, index) => {
      const inner = renderXcpNode(item, `${indent}    `);
      return `${indent}<item key="${index}">\n${inner}\n${indent}</item>`;
    })
    .join("\n");
}

function renderXcpNode(node: XcpNode, indent: string): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") {
    return `${indent}${xmlEscape(String(node))}`;
  }
  if (Array.isArray(node)) {
    return `${indent}<dt_array>\n${buildDtArray(node, `${indent}  `)}\n${indent}</dt_array>`;
  }
  const lines = Object.entries(node).map(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      return `${indent}<item key="${xmlEscape(key)}">${xmlEscape(String(value))}</item>`;
    }
    const inner = renderXcpNode(value as XcpNode, `${indent}  `);
    return `${indent}<item key="${xmlEscape(key)}">\n${inner}\n${indent}</item>`;
  });
  return `${indent}<dt_assoc>\n${lines.join("\n")}\n${indent}</dt_assoc>`;
}

export function buildXcpEnvelope(action: string, object: string, attributes: XcpAssoc): string {
  const body = renderXcpNode(
    {
      protocol: "XCP",
      action,
      object,
      attributes,
    },
    "        "
  );

  return `<?xml version='1.0' encoding='UTF-8' standalone='no' ?>
<!DOCTYPE OPS_envelope SYSTEM 'ops.dtd'>
<OPS_envelope>
<header>
    <version>0.9</version>
</header>
<body>
<data_block>
${body}
</data_block>
</body>
</OPS_envelope>`;
}

export function parseOpenSrsReply(xml: string): OpenSrsReply {
  const attributes: Record<string, string> = {};
  const attrsMatch = xml.match(/<item key="attributes">\s*<dt_assoc>([\s\S]*?)<\/dt_assoc>/i);
  if (attrsMatch) {
    for (const m of attrsMatch[1].matchAll(/<item key="([^"]+)">([^<]*)<\/item>/gi)) {
      attributes[m[1]] = m[2].trim();
    }
  }

  const item = (key: string) => {
    const m = xml.match(new RegExp(`<item key="${key}">([^<]*)</item>`, "i"));
    return m?.[1]?.trim() ?? null;
  };

  return {
    isSuccess: item("is_success") === "1",
    responseCode: item("response_code"),
    responseText: item("response_text"),
    attributes,
    raw: xml,
  };
}

export async function postOpenSrs(config: OpenSrsConfig, xml: string): Promise<OpenSrsReply> {
  const signature = opensrsSignature(xml, config.apiKey);
  const res = await fetch(`${config.host}/`, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "X-Username": config.username,
      "X-Signature": signature,
    },
    body: xml,
    signal: AbortSignal.timeout(25_000),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      isSuccess: false,
      responseCode: String(res.status),
      responseText: text.slice(0, 400) || res.statusText,
      attributes: {},
      raw: text,
    };
  }

  return parseOpenSrsReply(text);
}

export async function lookupOpenSrsDomain(
  config: OpenSrsConfig,
  domain: string
): Promise<{ available: boolean; premium: boolean; reply: OpenSrsReply }> {
  const xml = buildXcpEnvelope("LOOKUP", "DOMAIN", {
    domain,
    no_cache: 1,
  });
  const reply = await postOpenSrs(config, xml);
  const status = reply.attributes.status?.toLowerCase();
  return {
    available: reply.isSuccess && status === "available",
    premium: reply.attributes.reason === "Premium Name",
    reply,
  };
}

export async function getOpenSrsDomainPrice(
  config: OpenSrsConfig,
  domain: string,
  regType: "new" | "renewal" | "transfer" = "new"
): Promise<{ price: string | null; reply: OpenSrsReply }> {
  const xml = buildXcpEnvelope("GET_PRICE", "DOMAIN", {
    domain,
    period: 1,
    reg_type: regType,
  });
  const reply = await postOpenSrs(config, xml);
  return {
    price: reply.attributes.price ?? null,
    reply,
  };
}

export function buildContactAssoc(contact: OpenSrsContact): XcpAssoc {
  const out: Record<string, XcpNode> = {
    first_name: contact.first_name,
    last_name: contact.last_name,
    org_name: contact.org_name,
    address1: contact.address1,
    city: contact.city,
    state: contact.state,
    country: contact.country,
    postal_code: contact.postal_code,
    phone: contact.phone,
    email: contact.email,
  };
  if (contact.address2) out.address2 = contact.address2;
  if (contact.address3) out.address3 = contact.address3;
  if (contact.fax) out.fax = contact.fax;
  return out;
}

export async function registerOpenSrsDomain(input: {
  config: OpenSrsConfig;
  domain: string;
  userId: string;
  contact: OpenSrsContact;
}): Promise<OpenSrsReply> {
  const lookup = await lookupOpenSrsDomain(input.config, input.domain);
  if (!lookup.available) {
    return {
      isSuccess: false,
      responseCode: lookup.reply.responseCode ?? "211",
      responseText: lookup.premium
        ? "Domaine premium — activez le tier registry premium dans OpenSRS."
        : lookup.reply.responseText ?? "Domaine indisponible.",
      attributes: lookup.reply.attributes,
      raw: lookup.reply.raw,
    };
  }

  const priceResult = await getOpenSrsDomainPrice(input.config, input.domain, "new");
  const contact = buildContactAssoc(input.contact);
  const regUsername = buildRegUsername(input.userId);
  const regPassword = buildRegPassword(input.userId, input.domain);

  const attrs: XcpAssoc = {
    domain: input.domain,
    period: 1,
    reg_type: "new",
    reg_username: regUsername,
    reg_password: regPassword,
    handle: "process",
    auto_renew: 0,
    f_whois_privacy: 1,
    custom_nameservers: 0,
    custom_tech_contact: 0,
    contact_set: {
      owner: contact,
      admin: contact,
      billing: contact,
    },
  };

  if (lookup.premium && priceResult.price) {
    attrs.premium_price_to_verify = priceResult.price;
  }

  const xml = buildXcpEnvelope("SW_REGISTER", "DOMAIN", attrs);
  return postOpenSrs(input.config, xml);
}

function buildRegUsername(userId: string): string {
  const base = userId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const username = `klir${base}`.slice(0, 20);
  return username.length >= 3 ? username : `klir${base.padEnd(3, "0")}`.slice(0, 20);
}

function buildRegPassword(userId: string, domain: string): string {
  const seed = md5Hex(`${userId}:${domain}:klirline`);
  return `Klir${seed.slice(0, 10)}!9`;
}
