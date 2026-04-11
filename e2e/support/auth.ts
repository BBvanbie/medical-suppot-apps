import { expect, type Page } from "@playwright/test";

const webAuthnReadyPages = new WeakSet<Page>();

async function ensureVirtualWebAuthn(page: Page) {
  if (webAuthnReadyPages.has(page)) return;

  const client = await page.context().newCDPSession(page);
  await client.send("WebAuthn.enable");
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  webAuthnReadyPages.add(page);
}

async function completeMfaIfRequired(page: Page) {
  const pathname = new URL(page.url()).pathname;
  if (pathname !== "/mfa/setup" && pathname !== "/mfa/verify") return;

  await ensureVirtualWebAuthn(page);

  if (pathname === "/mfa/setup") {
    await page.locator("#credential-name").fill("E2E virtual authenticator");
    await page.getByRole("button", { name: "MFA を登録" }).click();
  } else {
    await page.getByRole("button", { name: "MFA で確認" }).click();
  }

  await page.waitForURL((url) => {
    if (url.protocol === "chrome-error:") return true;
    return url.pathname !== "/mfa/setup" && url.pathname !== "/mfa/verify";
  }, { timeout: 30_000 });

  if (page.url().startsWith("chrome-error:")) {
    throw new Error(`MFA completed but browser navigated to an error page. URL=${page.url()}`);
  }
}

export async function loginAs(page: Page, credentials: { username: string; password: string }, callbackUrl = "/") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByTestId("login-username").fill(credentials.username);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 });
  } catch {
    await page.waitForTimeout(500);
    const currentUrl = page.url();
    if (currentUrl.startsWith("chrome-error:")) {
      await page.goto(callbackUrl);
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 }).catch(() => undefined);
    }
    if (!page.url().includes("/login")) {
      await completeMfaIfRequired(page);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      return;
    }
    const errorText = await page.locator("form").textContent({ timeout: 1000 }).catch(() => "");
    throw new Error(`Login failed for ${credentials.username}. URL=${page.url()} form=${errorText ?? ""}`);
  }
  if (page.url().startsWith("chrome-error:")) {
    await page.goto(callbackUrl);
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 }).catch(() => undefined);
  }
  await expect(page).not.toHaveURL(/\/login/);

  await completeMfaIfRequired(page);

  await page.waitForLoadState("networkidle").catch(() => undefined);
}
