/**
 * Switchboard E2E Tests
 * =============================================================================
 * Tests the main user flows:
 * 1. Sign up → Login → Dashboard loads
 * 2. Create client → Appears in list
 * 3. Create agent (with budget) → Appears in list
 * 
 * Note: These tests require a running dev server and a test Supabase instance.
 * For CI, you may need to configure test user credentials via env vars.
 * =============================================================================
 */

import { test, expect, type Page } from "@playwright/test";

// Test configuration
const TEST_EMAIL = process.env.TEST_USER_EMAIL || `test-${Date.now()}@example.com`;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPassword123!";
const TEST_NAME = "E2E Test User";
const TEST_ORG_NAME = "E2E Test Agency";

// Helper to generate unique names for test data
function uniqueName(prefix: string): string {
    return `${prefix} ${Date.now().toString(36)}`;
}

// Helper to wait for navigation to complete
async function waitForUrl(page: Page, urlPattern: string | RegExp) {
    await page.waitForURL(urlPattern, { timeout: 15000 });
}

test.describe("Authentication Flow", () => {
    test.skip("signup creates account and shows confirmation message", async ({ page }) => {
        // Note: This test is skipped by default because Supabase requires email verification
        // To run this test, configure your Supabase to auto-confirm test emails

        await page.goto("/auth/signup");

        // Fill out the signup form
        await page.fill("#full_name", TEST_NAME);
        await page.fill("#organization_name", TEST_ORG_NAME);
        await page.fill("#email", TEST_EMAIL);
        await page.fill("#password", TEST_PASSWORD);

        // Submit the form
        await page.click('button[type="submit"]');

        // Wait for response - should show a confirmation message
        await expect(page.getByText(/check your email|created|confirm/i)).toBeVisible({ timeout: 10000 });
    });

    test.skip("login with valid credentials redirects to dashboard", async ({ page }) => {
        // Note: This test requires a verified test user
        // Set TEST_USER_EMAIL and TEST_USER_PASSWORD in your environment

        await page.goto("/auth/login");

        // Fill out the login form
        await page.fill("#email", TEST_EMAIL);
        await page.fill("#password", TEST_PASSWORD);

        // Submit the form
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await waitForUrl(page, /\/dashboard/);

        // Dashboard should be visible
        await expect(page.locator("h1")).toContainText(/dashboard|overview/i);
    });
});

test.describe("Landing Page", () => {
    test("home page loads correctly", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });

        // Check for key elements - h1 contains "Financial Observability"
        await expect(page.locator("h1")).toContainText(/Financial Observability/i, { timeout: 10000 });
        await expect(page.getByText(/AI Agents/i).first()).toBeVisible();

        // Check navigation exists - link says "Sign in"
        await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    });

    test("navigation links work", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });

        // Wait for sign in link to appear
        await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible({ timeout: 10000 });

        // Click sign in link
        await page.getByRole("link", { name: /sign in/i }).click();

        // Should be on login page
        await waitForUrl(page, /\/auth\/login/);
        await expect(page.locator("h1")).toContainText(/sign in|login|welcome back/i);
    });
});

test.describe("Protected Routes", () => {
    test("dashboard redirects to login when not authenticated", async ({ page }) => {
        await page.goto("/dashboard");

        // Should redirect to login
        await waitForUrl(page, /\/auth\/login/);
    });

    test("clients page redirects to login when not authenticated", async ({ page }) => {
        await page.goto("/dashboard/clients");

        // Should redirect to login with redirect param
        await waitForUrl(page, /\/auth\/login/);
        expect(page.url()).toContain("redirect");
    });

    test("agents page redirects to login when not authenticated", async ({ page }) => {
        await page.goto("/dashboard/agents");

        // Should redirect to login with redirect param
        await waitForUrl(page, /\/auth\/login/);
        expect(page.url()).toContain("redirect");
    });
});

// Authenticated tests - These require a logged-in session
// To run these, you need to:
// 1. Set up a test user in Supabase with verified email
// 2. Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables
// 3. Remove the .skip from the test blocks

test.describe.skip("Authenticated: Clients CRUD", () => {
    // Login before each test
    test.beforeEach(async ({ page }) => {
        await page.goto("/auth/login");
        await page.fill("#email", process.env.TEST_USER_EMAIL!);
        await page.fill("#password", process.env.TEST_USER_PASSWORD!);
        await page.click('button[type="submit"]');
        await waitForUrl(page, /\/dashboard/);
    });

    test("can navigate to clients page", async ({ page }) => {
        await page.goto("/dashboard/clients");

        await expect(page.locator("h1")).toContainText(/Clients/i);
        await expect(page.getByRole("link", { name: /add client/i })).toBeVisible();
    });

    test("can create a new client", async ({ page }) => {
        const clientName = uniqueName("Test Client");

        // Navigate to new client form
        await page.goto("/dashboard/clients/new");

        // Fill out the form
        await page.fill("#name", clientName);
        await page.fill("#contact_email", "test@example.com");

        // Submit
        await page.click('button[type="submit"]');

        // Should redirect to clients list
        await waitForUrl(page, /\/dashboard\/clients$/);

        // New client should appear in the list
        await expect(page.getByText(clientName)).toBeVisible();
    });

    test("can view client details", async ({ page }) => {
        // First create a client
        const clientName = uniqueName("Detail Test Client");
        await page.goto("/dashboard/clients/new");
        await page.fill("#name", clientName);
        await page.click('button[type="submit"]');
        await waitForUrl(page, /\/dashboard\/clients$/);

        // Click on the client name to view details
        await page.click(`text=${clientName}`);

        // Should be on detail page
        await expect(page.locator("h1")).toContainText(clientName);
    });
});

test.describe.skip("Authenticated: Agents CRUD", () => {
    // Login before each test
    test.beforeEach(async ({ page }) => {
        await page.goto("/auth/login");
        await page.fill("#email", process.env.TEST_USER_EMAIL!);
        await page.fill("#password", process.env.TEST_USER_PASSWORD!);
        await page.click('button[type="submit"]');
        await waitForUrl(page, /\/dashboard/);
    });

    test("can navigate to agents page", async ({ page }) => {
        await page.goto("/dashboard/agents");

        await expect(page.locator("h1")).toContainText(/Agents/i);
        await expect(page.getByRole("link", { name: /add agent/i })).toBeVisible();
    });

    test("can create a new agent with budget", async ({ page }) => {
        const agentName = uniqueName("Test Agent");
        const budgetAmount = "1500";

        // Navigate to new agent form
        await page.goto("/dashboard/agents/new");

        // Fill out the form
        await page.fill("#name", agentName);
        await page.fill("#description", "E2E test agent");
        await page.fill("#monthly_budget", budgetAmount);

        // Submit
        await page.click('button[type="submit"]');

        // Should redirect to agents list
        await waitForUrl(page, /\/dashboard\/agents$/);

        // New agent should appear in the list
        await expect(page.getByText(agentName)).toBeVisible();

        // Budget should be displayed (formatted as currency)
        await expect(page.getByText("$1,500.00")).toBeVisible();
    });

    test("can view agent details with budget stats", async ({ page }) => {
        // First create an agent
        const agentName = uniqueName("Stats Test Agent");
        await page.goto("/dashboard/agents/new");
        await page.fill("#name", agentName);
        await page.fill("#monthly_budget", "2000");
        await page.click('button[type="submit"]');
        await waitForUrl(page, /\/dashboard\/agents$/);

        // Click on the agent name to view details
        await page.click(`text=${agentName}`);

        // Should be on detail page
        await expect(page.locator("h1")).toContainText(agentName);

        // Should show budget stats
        await expect(page.getByText("Monthly Budget")).toBeVisible();
        await expect(page.getByText("$2,000.00")).toBeVisible();
        await expect(page.getByText("Remaining")).toBeVisible();
    });
});
