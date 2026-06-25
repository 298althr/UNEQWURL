import { test, expect } from '@playwright/test';
import { register, login } from './helpers';

const USER = `i${Date.now().toString(36).slice(0, 8)}`;
const PASS = 'SecurePass123!';

test.describe('UI interactions', () => {
  test('dashboard navigation visible after login', async ({ page }) => {
    await register(page, USER, PASS);
    await login(page, USER, PASS);
    await expect(page.locator('[data-testid="profile-trigger"]')).toBeVisible();
  });

  test('profile dropdown opens and contains logout', async ({ page }) => {
    await register(page, `${USER}d`, PASS);
    await login(page, `${USER}d`, PASS);
    await page.click('[data-testid="profile-trigger"]');
    await expect(page.locator('[data-testid="profile-dropdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
  });

  test('docs console-guide renders hero and TOC', async ({ page }) => {
    await page.goto('/docs/console-guide');
    await page.waitForLoadState('load');
    await expect(page.locator('.guide-hero-badge')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Console Mastery');
    // Verify a TOC anchor exists
    await expect(page.locator('a[href="#audit"]')).toBeVisible();
  });

  test('uploads page requires login', async ({ page }) => {
    await page.goto('/uploads');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login form shows validation for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="login-submit"]');
    // HTML5 required validation prevents submission; page stays on login
    await expect(page).toHaveURL(/\/login/);
  });
});
