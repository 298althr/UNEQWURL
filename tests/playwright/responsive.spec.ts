import { test, expect } from '@playwright/test';
import { register, login } from './helpers';

const USER = `r${Date.now().toString(36).slice(0, 8)}`;
const PASS = 'SecurePass123!';

test.describe('Responsive layout', () => {
  test('mobile dashboard has profile trigger and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await register(page, USER, PASS);
    await login(page, USER, PASS);
    await expect(page.locator('[data-testid="profile-trigger"]')).toBeVisible();
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('tablet login form fits viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', USER);
    await page.fill('[data-testid="login-password"]', PASS);
    await expect(page.locator('[data-testid="login-submit"]')).toBeInViewport();
  });

  test('desktop dashboard renders hero', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await register(page, `${USER}d`, PASS);
    await login(page, `${USER}d`, PASS);
    await page.waitForSelector('.hero', { state: 'visible' });
  });
});
