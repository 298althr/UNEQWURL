import { Page, expect } from '@playwright/test';

export const TEST_USERNAME = `pw${Date.now().toString(36).slice(0, 8)}`;
export const TEST_PASSWORD = 'TestPass123!';

export async function register(page: Page, username: string, password: string = TEST_PASSWORD) {
  await page.goto('/register');
  await page.fill('[data-testid="register-username"]', username);
  await page.fill('[data-testid="register-password"]', password);
  await page.click('[data-testid="register-submit"]');
  await page.waitForSelector('[data-testid="register-success"]', { timeout: 10000 });
}

export async function login(page: Page, username: string, password: string = TEST_PASSWORD) {
  await page.goto('/login');
  // Dismiss PWA install modal if it appears
  const dismiss = page.locator('[data-testid="pwa-dismiss"]');
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
  await page.fill('[data-testid="login-username"]', username);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

export async function logout(page: Page) {
  await page.click('[data-testid="profile-trigger"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL(/\/login/, { timeout: 10000 });
}

export async function assertNoAuthCache(page: Page) {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === '298eq_session');
  expect(sessionCookie?.value).toBeFalsy();
}

export async function createAdminSong(page: Page, title: string, fileUrl: string) {
  const res = await page.request.post('/api/admin/songs', {
    data: { title, file_url: fileUrl },
  });
  expect(res.status()).toBe(201);
  return res.json();
}
