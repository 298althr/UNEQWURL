import { test, expect } from '@playwright/test';
import { register, login, logout, assertNoAuthCache } from './helpers';

const USER = `u${Date.now().toString(36).slice(0, 8)}`;
const PASS = 'SecurePass123!';

test.describe('Authentication & Logout', () => {
  test('register, login, and access dashboard', async ({ page }) => {
    await register(page, USER, PASS);
    await login(page, USER, PASS);
    await expect(page).toHaveURL(/\/dashboard/);
    const me = await page.request.get('/api/auth/me');
    expect(me.status()).toBe(200);
    const body = await me.json();
    expect(body.username).toBe(USER);
  });

  test('logout clears session and redirects', async ({ page }) => {
    await register(page, `${USER}a`, PASS);
    await login(page, `${USER}a`, PASS);
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
    await assertNoAuthCache(page);
  });

  test('protected pages redirect to login after logout', async ({ page }) => {
    await register(page, `${USER}b`, PASS);
    await login(page, `${USER}b`, PASS);
    await logout(page);

    const resp = await page.request.get('/dashboard', { maxRedirects: 0 });
    const status = resp.status();
    const isRedirect = status >= 300 && status < 400;
    const isUnauthorized = status === 401;
    expect(isRedirect || isUnauthorized).toBe(true);
    if (isRedirect) {
      expect(resp.headers()['location']).toMatch(/\/login/);
    }
  });

  test('admin pages return 403 for non-admin', async ({ page }) => {
    await register(page, `${USER}c`, PASS);
    await login(page, `${USER}c`, PASS);
    const admin = await page.request.get('/api/admin/users');
    expect(admin.status()).toBe(403);
  });

  test('login errors are visible and do not leak user existence', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', 'nonexistent_user_xyz');
    await page.fill('[data-testid="login-password"]', 'wrongpass');
    await page.click('[data-testid="login-submit"]');
    const error = page.locator('[data-testid="login-error"]');
    await expect(error).toBeVisible();
    const text = await error.textContent();
    expect(text).toMatch(/invalid credentials/i);
    expect(text).not.toMatch(/user not found/i);
  });
});
