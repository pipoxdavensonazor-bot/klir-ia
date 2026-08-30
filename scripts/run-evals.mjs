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
 *   EVAL_GOLDEN_STATIC_ONLY=1  (CI — fixtures locales, sans fetch prod)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreCase } from "../evals/checks.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const goldenPath = join(root, "evals", "golden-set.json");
const fixturesPath = join(root, "evals", "golden-fixtures.json");

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.EVAL_BASE_URL || "https://klirline.io",
    caseId: null,
    dryRun: false,
    staticOnly:
      process.env.EVAL_GOLDEN_STATIC_ONLY === "1" ||
      process.env.CI === "true" ||
      process.env.GITHUB_ACTIONS === "true",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url") out.baseUrl = argv[++i];
    else if (a === "--case") out.caseId = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--static-only") out.staticOnly = true;
    else if (a === "--live") out.staticOnly = false;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

async function callChat(baseUrl, input, skill) {
  const body = {
    messages: [{ role: "user", content: input }],
  };
  if (skill) body.skill = skill;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "KlirIA-Eval/1.0 (+https://klirline.io)",
  };
  if (process.env.EVAL_API_KEY) {
    headers["X-Eval-Key"] = process.env.EVAL_API_KEY.trim();
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint =
      typeof data.error === "string"
        ? data.error
        : typeof data === "object" && data !== null && Object.keys(data).length
          ? JSON.stringify(data).slice(0, 200)
          : `HTTP ${res.status}`;
    throw new Error(hint);
  }

  return {
    content: data.content || data.reply || data.message || "",
    skill: data.skill ?? null,
    provider: data.provider,
    model: data.model,
  };
}

function printReport(suite, results, gateOk, mode) {
  const passed = results.filter((r) => r.pass).length;
  const blockers = results.filter((r) => r.severity === "blocker");
  const blockerFails = blockers.filter((r) => !r.pass);

  console.log("\n══════════════════════════════════════");
  console.log(` Klir IA evals — ${suite.name}`);
  if (mode) console.log(` Mode     : ${mode}`);
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

function validateSuiteStructure(suite, cases) {
  const issues = [];
  if (!suite.gate?.minPassRate) issues.push("gate.minPassRate manquant");
  for (const c of cases) {
    if (!c.id) issues.push("cas sans id");
    if (!c.input) issues.push(`${c.id || "?"}: input manquant`);
    if (!Array.isArray(c.checks) || !c.checks.length) issues.push(`${c.id}: checks vides`);
  }
  return issues;
}

function runStaticGoldenSet(suite, cases) {
  if (!existsSync(fixturesPath)) {
    throw new Error(`Fixtures introuvables : ${fixturesPath}`);
  }
  const fixtures = JSON.parse(readFileSync(fixturesPath, "utf8"));
  const issues = validateSuiteStructure(suite, cases);
  if (issues.length) {
    throw new Error(`Golden set invalide : ${issues.join("; ")}`);
  }

  const results = [];
  for (const caze of cases) {
    const fixture = fixtures.cases?.[caze.id];
    if (!fixture?.content) {
      results.push({
        id: caze.id,
        severity: caze.severity || "soft",
        tags: caze.tags || [],
        pass: false,
        failed: [{ type: "fixture", detail: "fixture manquante dans golden-fixtures.json" }],
        checks: [],
        skill: null,
        preview: "",
      });
      continue;
    }
    results.push(
      scoreCase(caze, {
        content: fixture.content,
        skill: fixture.skill ?? null,
        provider: "fixture",
        model: "static",
      })
    );
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      `Usage: node scripts/run-evals.mjs [--base-url URL] [--case ID] [--dry-run] [--static-only|--live]`
    );
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

  const mode = args.staticOnly ? "static (CI fixtures)" : "live (prod API)";
  console.log(`Base URL : ${args.baseUrl}`);
  console.log(`Mode     : ${mode}`);
  console.log(`Cas      : ${cases.length}`);

  let results;
  if (args.staticOnly) {
    results = runStaticGoldenSet(suite, cases);
    for (const r of results) {
      console.log(`→ ${r.id} … ${r.pass ? "PASS" : "FAIL"}`);
    }
  } else {
    results = [];
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
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const rate = results.length ? passed / results.length : 0;
  const blockerFails = results.filter((r) => r.severity === "blocker" && !r.pass).length;
  const gate = suite.gate || { minPassRate: 0.85, blockerFailMax: 0 };
  const gateOk = rate >= gate.minPassRate && blockerFails <= gate.blockerFailMax;

  printReport(suite, results, gateOk, mode);

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
        mode,
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
