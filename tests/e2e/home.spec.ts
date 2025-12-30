import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the Switchboard landing page", async ({ page }) => {
    await page.goto("/");

    // Check for main headline
    await expect(
      page.getByRole("heading", { name: /Financial OS for/i })
    ).toBeVisible();

    // Check for key feature sections
    await expect(page.getByText("Agent Cards")).toBeVisible();
    await expect(page.getByText("Policy Engine")).toBeVisible();
    await expect(page.getByText("Auto Rebilling")).toBeVisible();
    await expect(page.getByText("Real-time Analytics")).toBeVisible();
  });

  test("should display stats section", async ({ page }) => {
    await page.goto("/");

    // Check for market stats
    await expect(page.getByText("$8.4B")).toBeVisible();
    await expect(page.getByText("LLM API Spend")).toBeVisible();
  });

  test("should have working CTA buttons", async ({ page }) => {
    await page.goto("/");

    // Check CTAs exist
    await expect(
      page.getByRole("button", { name: /Get Early Access/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /View Documentation/i })
    ).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Hero should still be visible
    await expect(
      page.getByRole("heading", { name: /Financial OS for/i })
    ).toBeVisible();

    // Features should stack vertically (we just check they exist)
    await expect(page.getByText("Agent Cards")).toBeVisible();
  });
});

