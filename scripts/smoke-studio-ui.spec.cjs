const { test, expect } = require("@playwright/test");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const demoImagePath = path.join(process.cwd(), "public", "assets", "vibefx", "demo-astronaut.png");

test.use({ viewport: { width: 1440, height: 900 } });

test("studio imports a layout render into the publication preview", async ({ page }) => {
  const consoleIssues = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`pageerror: ${error.message}`);
  });

  await page.goto(`${baseUrl}/studio`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Creer une mise en page")).toBeVisible();

  await page.getByRole("button", { name: "Creer une mise en page", exact: true }).click();
  await expect(page.getByRole("button", { name: "Layout" })).toBeVisible();

  await page.locator('input[type="file"]').first().setInputFiles(demoImagePath);
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return canvas && canvas.width > 0 && canvas.height > 0;
  });

  const publicationButton = page.locator("header button", { hasText: "Publication" }).last();
  await expect(publicationButton).toBeVisible();
  await expect(publicationButton).toBeEnabled();
  await publicationButton.click();
  await expect(page.getByText("Description et preview finale")).toBeVisible();
  await expect(page.getByText("Visuel importe")).toBeVisible();
  await expect(page.getByText("Score preview")).toBeVisible();

  const caption = page.getByPlaceholder("Texte du post, hashtags, appel a l'action...");
  await caption.fill("Publication test depuis la mise en page #vibefx");
  await expect(page.getByText("47/2200 caracteres")).toBeVisible();

  const relevantIssues = consoleIssues.filter((line) => !line.includes("Download the React DevTools"));
  expect(relevantIssues).toEqual([]);
});
