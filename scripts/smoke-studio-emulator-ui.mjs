import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import net from "node:net";

import { chromium } from "@playwright/test";

const projectId = "demo-vibefx";
const env = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.localhost`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:demo",
  NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION: "europe-west9",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
};

async function findFreePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  server.close();
  await once(server, "close");
  return port;
}

async function waitForUrl(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function stopProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

async function queryPublicationDocuments(uid, accessToken) {
  const response = await fetch(
    `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "publications" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "ownerUid" },
              op: "EQUAL",
              value: { stringValue: uid },
            },
          },
        },
      }),
    }
  );
  assert.equal(response.status, 200, "Firestore emulator owner publication query should be readable through REST");
  const body = await response.json();
  return body.map((entry) => entry.document).filter(Boolean);
}

async function readBrowserAuth(page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("firebaseLocalStorageDb");
    const db = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction("firebaseLocalStorage", "readonly");
    const store = tx.objectStore("firebaseLocalStorage");
    const getAll = store.getAll();
    const values = await new Promise((resolve, reject) => {
      getAll.onerror = () => reject(getAll.error);
      getAll.onsuccess = () => resolve(getAll.result);
    });
    const authUser = values.map((item) => item.value).find((value) => value?.uid && value?.stsTokenManager?.accessToken);
    return {
      uid: authUser?.uid || "",
      accessToken: authUser?.stsTokenManager?.accessToken || "",
    };
  });
}

const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npmBin, ["run", "build"], {
  cwd: process.cwd(),
  env,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (build.status !== 0) {
  console.error(build.stdout || "");
  console.error(build.stderr || "");
  process.exit(build.status || 1);
}

const next = spawn(npmBin, ["run", "start", "--", "-p", String(port), "-H", "127.0.0.1"], {
  cwd: process.cwd(),
  env,
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
});

const logs = [];
next.stdout.on("data", (chunk) => logs.push(chunk.toString()));
next.stderr.on("data", (chunk) => logs.push(chunk.toString()));

let browser;
try {
  await waitForUrl(`${baseUrl}/studio`);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleIssues = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      const text = message.text();
      if (
        !text.includes("Download the React DevTools") &&
        !text.includes("getMetaOAuthStatus") &&
        !text.includes("ERR_CONNECTION_REFUSED") &&
        !text.includes("FirebaseError: internal")
      ) {
        consoleIssues.push(`${message.type()}: ${text}`);
      }
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`pageerror: ${error.message}`);
  });

  await page.goto(`${baseUrl}/studio`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Creer une mise en page", exact: true }).click();
  await page.getByLabel("Lancer la demonstration automatique").click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll("button"))
    .some((button) => button.textContent?.includes("Importer") && !button.disabled));
  await page.locator("button", { hasText: "Importer" }).first().click();

  await page.getByPlaceholder("Texte du post, hashtags, appel a l'action...").fill(
    "Publication sauvegardee depuis le studio avec emulateurs #vibefx"
  );
  await page.locator("input").first().fill("Smoke UI emulator");
  await page.getByRole("button", { name: "Brouillon" }).click();
  await page.getByText("Brouillon enregistre.").waitFor({ timeout: 20_000 });

  const authState = await readBrowserAuth(page);
  assert.ok(authState.uid, "browser should keep the anonymous auth uid");
  assert.ok(authState.accessToken, "browser should keep an auth token for Firestore REST verification");
  const documents = await queryPublicationDocuments(authState.uid, authState.accessToken);
  assert.equal(documents.length, 1, "one publication should be saved through the UI");
  const fields = documents[0].fields || {};
  assert.equal(fields.status?.stringValue, "draft");
  assert.equal(fields.title?.stringValue, "Smoke UI emulator");
  assert.equal(fields.ownerUid?.stringValue, authState.uid);
  assert.match(fields.image?.stringValue || "", /users%2F.+%2Fpublications%2F.+cover\.jpg/);

  assert.deepEqual(consoleIssues, []);
  console.log("studio emulator UI smoke test OK");
} catch (error) {
  console.error(logs.join(""));
  throw error;
} finally {
  if (browser) await browser.close();
  stopProcessTree(next);
}
