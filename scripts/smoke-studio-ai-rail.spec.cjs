const { test, expect } = require("@playwright/test");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const blockedProviderHosts = [
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "fal.ai",
  "replicate.com",
  "api.replicate.com",
];

test.describe("studio AI rail", () => {
  test("opens, switches actions by tab, validates prompt and stays server-gated", async ({ page }) => {
    const directProviderCalls = [];
    page.on("request", (request) => {
      const url = request.url();
      if (blockedProviderHosts.some((host) => url.includes(host))) {
        directProviderCalls.push(url);
      }
    });

    await page.goto(`${baseUrl}/studio?workspace=layout`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Studio" })).toBeVisible();

    await page.getByTestId("studio-ai-toggle").click();
    await expect(page.getByTestId("studio-ai-rail")).toHaveAttribute("data-open", "true");
    await expect(page.getByText("Ameliorer cette image")).toBeVisible();
    await expect(page.getByTestId("studio-ai-estimate")).toContainText("credits");

    await page.getByRole("button", { name: "Fusion" }).click();
    await expect(page.getByText("Generer un fond de campagne")).toBeVisible();
    await expect(page.getByText("Extraire une palette")).toBeVisible();

    await page.getByRole("button", { name: "Layout" }).click();
    await expect(page.getByText("Generer un layout depuis brief")).toBeVisible();
    await expect(page.getByText("Verifier lisibilite")).toBeVisible();

    await page.getByTestId("studio-ai-action-layout-copy").click();
    await page.getByTestId("studio-ai-prompt").fill("");
    await page.getByTestId("studio-ai-run").click();
    await expect(page.getByTestId("studio-ai-error")).toContainText("Prompt requis");

    await page.getByTestId("studio-ai-prompt").fill("Caption courte pour lancement premium #vibefx");
    await page.getByTestId("studio-ai-run").click();
    await expect(page.getByTestId("studio-ai-job-trace")).toBeVisible();
    await expect(
      page.getByTestId("studio-ai-output").or(page.getByTestId("studio-ai-error"))
    ).toBeVisible({ timeout: 15000 });

    await page.setViewportSize({ width: 390, height: 820 });
    await expect(page.getByTestId("studio-ai-rail")).toHaveAttribute("data-open", "true");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
    expect(directProviderCalls).toEqual([]);
  });
});
