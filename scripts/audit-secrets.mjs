import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const ignoredDirs = new Set([
  ".git",
  ".next",
  "build",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
]);

const ignoredFiles = new Set([
  ".env",
  ".env.local",
  "firebase-debug.log",
  "firestore-debug.log",
  "package-lock.json",
  "ui-debug.log",
]);

const ignoredSuffixes = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".lock",
  ".svg",
  ".webp",
];

const secretPatterns = [
  [/AIza[0-9A-Za-z_-]{35}/, "Google/Firebase API key"],
  [/EA[A-Za-z0-9]{60,}/, "Meta/Facebook access token"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/, "private key block"],
  [/["']?private_key["']?\s*[:=]\s*["'][^"']+["']/, "service account private_key value"],
];

const sensitiveEnvNames = [
  "META_APP_SECRET",
  "META_TOKEN_ENCRYPTION_KEY",
  "META_ACCESS_TOKEN",
  "META_IG_USER_ID",
  "META_FACEBOOK_PAGE_ID",
];

function listFiles(path = ".") {
  const absolute = join(root, path);
  const stat = statSync(absolute);

  if (stat.isDirectory()) {
    if (ignoredDirs.has(path) || ignoredDirs.has(path.split(/[\\/]/).at(-1))) return [];
    return readdirSync(absolute).flatMap((entry) => listFiles(path === "." ? entry : join(path, entry)));
  }

  const fileName = path.split(/[\\/]/).at(-1);
  if (ignoredFiles.has(path) || ignoredFiles.has(fileName)) return [];
  if (ignoredSuffixes.some((suffix) => path.toLowerCase().endsWith(suffix))) return [];
  return [path];
}

const findings = [];

for (const file of listFiles()) {
  if (!existsSync(join(root, file))) continue;
  const content = readFileSync(join(root, file), "utf8");

  for (const [pattern, label] of secretPatterns) {
    if (pattern.test(content)) findings.push(`${file}: possible ${label}`);
  }

  for (const name of sensitiveEnvNames) {
    const assignment = new RegExp(`^\\s*${name}\\s*=\\s*([^#\\r\\n]+)`, "m").exec(content);
    if (assignment && assignment[1].trim()) {
      findings.push(`${file}: ${name} has a committed value`);
    }
  }
}

assert.deepEqual(findings, [], `Potential committed secrets found:\n${findings.join("\n")}`);
console.log("secrets audit OK");
