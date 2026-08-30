#!/usr/bin/env node
/**
 * Klir IA — runner d'évals (golden set).
 *
 * Usage:
 *   npm run eval
 *   npm run eval -- --base-url http://localhost:3000
 *   npm run eval -- --case product-pricing-ca
 *   npm run eval -- --dry-run
 *
 * Env:
 *   EVAL_BASE_URL  (défaut https://klirline.io)
 *   EVAL_API_KEY   (header X-Eval-Key — bypass limite invité côté serveur)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreCase } from "../evals/checks.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const goldenPath = join(root, "evals", "golden-set.json");

function parseArgs(argv) {
  const out = { baseUrl: process.env.EVAL_BASE_URL || "https://klirline.io", caseId: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url") out.baseUrl = argv[++i];
    else if (a === "--case") out.caseId = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

async function callChat(baseUrl, input, skill) {
  const body = {
    messages: [{ role: "user", content: input }],
  };
  if (skill) body.skill = skill;

  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EVAL_API_KEY) {
    headers["X-Eval-Key"] = process.env.EVAL_API_KEY;
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return {
    content: data.content || data.reply || data.message || "",
    skill: data.skill ?? null,
    provider: data.provider,
    model: data.model,
  };
}

function printReport(suite, results, gateOk) {
  const passed = results.filter((r) => r.pass).length;
  const blockers = results.filter((r) => r.severity === "blocker");
  const blockerFails = blockers.filter((r) => !r.pass);

  console.log("\n══════════════════════════════════════");
  console.log(` Klir IA evals — ${suite.name}`);
  console.log("══════════════════════════════════════\n");

  for (const r of results) {
    const mark = r.pass ? "PASS" : "FAIL";
    const sev = r.severity === "blocker" ? "BLOCKER" : "soft";
    console.log(`[${mark}] ${r.id} (${sev}) skill=${r.skill ?? "—"} ${r.provider ? `@${r.provider}` : ""}`);
    if (!r.pass) {
      for (const f of r.failed) {
        console.log(`       ✗ ${f.type}: ${f.detail}`);
      }
      if (r.preview) console.log(`       … ${r.preview}`);
    }
  }

  const rate = results.length ? passed / results.length : 0;
  console.log("\n──────────────────────────────────────");
  console.log(`Pass rate : ${(rate * 100).toFixed(0)}% (${passed}/${results.length})`);
  console.log(`Blockers  : ${blockers.length - blockerFails.length}/${blockers.length} pass`);
  console.log(`Gate      : ${gateOk ? "SHIP" : "NO-SHIP"}`);
  console.log("──────────────────────────────────────\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/run-evals.mjs [--base-url URL] [--case ID] [--dry-run]`);
    process.exit(0);
  }

  const suite = JSON.parse(readFileSync(goldenPath, "utf8"));
  let cases = suite.cases || [];
  if (args.caseId) {
    cases = cases.filter((c) => c.id === args.caseId);
    if (!cases.length) {
      console.error(`Cas introuvable : ${args.caseId}`);
      process.exit(1);
    }
  }

  if (args.dryRun) {
    console.log(`Dry-run : ${cases.length} cas chargés depuis ${goldenPath}`);
    for (const c of cases) {
      console.log(`  - ${c.id} [${c.severity}] ${c.checks?.length || 0} checks`);
    }
    process.exit(0);
  }

  console.log(`Base URL : ${args.baseUrl}`);
  console.log(`Cas      : ${cases.length}`);

  const results = [];
  for (const caze of cases) {
    process.stdout.write(`→ ${caze.id} … `);
    try {
      const raw = await callChat(args.baseUrl, caze.input, caze.forceSkill);
      const scored = scoreCase(caze, raw);
      results.push(scored);
      console.log(scored.pass ? "PASS" : "FAIL");
    } catch (err) {
      const scored = {
        id: caze.id,
        severity: caze.severity || "soft",
        tags: caze.tags || [],
        pass: false,
        failed: [{ type: "request", detail: err instanceof Error ? err.message : String(err) }],
        checks: [],
        skill: null,
        preview: "",
      };
      results.push(scored);
      console.log("ERROR");
    }
    // léger espacement pour éviter rate-limit / burst
    await new Promise((r) => setTimeout(r, 800));
  }

  const passed = results.filter((r) => r.pass).length;
  const rate = results.length ? passed / results.length : 0;
  const blockerFails = results.filter((r) => r.severity === "blocker" && !r.pass).length;
  const gate = suite.gate || { minPassRate: 0.85, blockerFailMax: 0 };
  const gateOk = rate >= gate.minPassRate && blockerFails <= gate.blockerFailMax;

  printReport(suite, results, gateOk);

  const outDir = join(root, "evals", "results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = join(outDir, `run-${stamp}.json`);
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        suite: suite.name,
        baseUrl: args.baseUrl,
        at: new Date().toISOString(),
        gateOk,
        passRate: rate,
        blockerFails,
        results,
      },
      null,
      2
    )
  );
  console.log(`Rapport : ${outFile}`);

  process.exit(gateOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
