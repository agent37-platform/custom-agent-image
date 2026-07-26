#!/usr/bin/env node
// Publish template/ as this app's workspace template — `npm run release:agent`.
//
// Agent37 builds the folder on its own linux/amd64 builders and streams the log, so
// there is nothing to install locally and nothing published to a registry. Each run
// publishes a new revision; agents keep the revision they were created with until
// you update them (POST /v1/instances/{id}/update).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Must match the `template` value in src/config/agents.ts.
export const TEMPLATE_NAME = "custom-agent";

const API = process.env.AGENT37_API_BASE || "https://api.agent37.com";

export function apiKey() {
  if (process.env.AGENT37_API_KEY) return process.env.AGENT37_API_KEY;
  const line = fs
    .readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.startsWith("AGENT37_API_KEY="))
    .pop();
  return line ? line.slice("AGENT37_API_KEY=".length).trim().replace(/^["']|["']$/g, "") : "";
}

export async function templateExists(key) {
  const res = await fetch(`${API}/v1/templates/${TEMPLATE_NAME}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  return res.status === 200;
}

export function publish(key) {
  const res = spawnSync(
    "npx",
    ["--yes", "agent37", "templates", "build", path.join(ROOT, "template"), "--name", TEMPLATE_NAME],
    { stdio: "inherit", env: { ...process.env, AGENT37_API_KEY: key } }
  );
  if (res.status !== 0) throw new Error(`Building ${TEMPLATE_NAME} failed — see the log above.`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const key = apiKey();
  if (!key.startsWith("sk_live_")) {
    console.error("AGENT37_API_KEY missing — set it in .env.local (dashboard → Cloud → API keys).");
    process.exit(1);
  }
  try {
    publish(key);
    console.log(`\nPublished ${TEMPLATE_NAME}. New agents use it; roll existing ones from Settings.`);
  } catch (e) {
    console.error(`\n${e.message}`);
    process.exit(1);
  }
}
