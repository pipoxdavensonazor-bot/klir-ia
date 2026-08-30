#!/usr/bin/env node
/**
 * Sync catalog/skills → ~/.cursor/plugins/local/klir-ia/skills
 * Usage: node scripts/sync-plugin.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CATALOG_SKILLS = path.join(ROOT, "catalog", "skills");
const PLUGIN_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "plugins",
  "local",
  "klir-ia"
);
const PLUGIN_SKILLS = path.join(PLUGIN_DIR, "skills");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  if (!fs.existsSync(CATALOG_SKILLS)) {
    console.error("catalog/skills not found. Run generate-skills.mjs first.");
    process.exit(1);
  }
  if (!fs.existsSync(PLUGIN_DIR)) {
    console.error(`Plugin dir not found: ${PLUGIN_DIR}. Run plugin scaffold first.`);
    process.exit(1);
  }

  // Clean and copy skills
  if (fs.existsSync(PLUGIN_SKILLS)) {
    fs.rmSync(PLUGIN_SKILLS, { recursive: true });
  }
  copyDir(CATALOG_SKILLS, PLUGIN_SKILLS);

  const count = fs.readdirSync(PLUGIN_SKILLS).length;
  console.log(`Synced ${count} skills → ${PLUGIN_SKILLS}`);
}

main();
