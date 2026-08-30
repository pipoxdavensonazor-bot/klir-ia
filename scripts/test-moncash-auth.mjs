#!/usr/bin/env node
/**
 * Test MonCash OAuth (prod ou sandbox) sans afficher les secrets.
 * Usage: node scripts/test-moncash-auth.mjs [fichier-credentials]
 */
import fs from "fs";
import path from "path";

const filePath = path.resolve(process.argv[2] ?? "D:\\001-Klirline INC\\Moncash API\\API mONCASH.txt");
const sandbox = process.env.MONCASH_SANDBOX === "true";
const apiBase = sandbox
  ? "https://sandbox.moncashbutton.digicelgroup.com/Api"
  : "https://moncashbutton.digicelgroup.com/Api";

function parse(text) {
  let clientId = "";
  let clientSecret = "";
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const id = trimmed.match(/^Client Id:\s*(.+)$/i);
    if (id) clientId = id[1].trim();
    const sec = trimmed.match(/^Client Secret:\s*(.+)$/i);
    if (sec) clientSecret = sec[1].trim();
  }
  return { clientId, clientSecret };
}

/** Utilise le bloc après « klirline » si présent, sinon la dernière paire trouvée. */
function parsePreferred(text) {
  const lower = text.toLowerCase();
  const marker = lower.lastIndexOf("klirline");
  const slice = marker >= 0 ? text.slice(marker) : text;
  const parsed = parse(slice);
  if (parsed.clientId && parsed.clientSecret) return parsed;
  return parse(text);
}

if (!fs.existsSync(filePath)) {
  console.error("Fichier introuvable:", filePath);
  process.exit(1);
}

const { clientId, clientSecret } = parsePreferred(fs.readFileSync(filePath, "utf8"));
if (!clientId || !clientSecret) {
  console.error("Client Id / Client Secret manquants dans le fichier.");
  process.exit(1);
}

const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
const res = await fetch(`${apiBase}/oauth/token`, {
  method: "POST",
  headers: {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  },
  body: "grant_type=client_credentials&scope=read,write",
});

const body = await res.text();
if (!res.ok) {
  console.error(`❌ MonCash OAuth échec (${res.status}) — mode ${sandbox ? "sandbox" : "production"}`);
  console.error(body.slice(0, 200));
  process.exit(1);
}

console.log(`✅ MonCash OAuth OK — mode ${sandbox ? "sandbox" : "production"}`);
console.log(`   API: ${apiBase}`);
console.log(`   Return URL à configurer: https://klirline.io/api/checkout/moncash/return`);
