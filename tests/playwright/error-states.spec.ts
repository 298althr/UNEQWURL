import { test, expect } from '@playwright/test';
import { register, login } from './helpers';

const USER = `e${Date.now().toString(36).slice(0, 8)}`;
const PASS = 'SecurePass123!';

test.describe('Error states', () => {
  test('oversize upload rejected', async ({ page }) => {
    await register(page, USER, PASS);
    await login(page, USER, PASS);
    await page.goto('/uploads');
    await page.waitForLoadState('load');

    const fileInput = page.locator('[data-testid="file-input-music"]');
    await fileInput.setInputFiles({
      name: 'big.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.alloc(30 * 1024 * 1024 + 1, 0),
    });

    await expect(page.locator('[data-testid="upload-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-status"]')).toContainText('exceeds 30 MB');
  });

  test('unsupported file type rejected', async ({ page }) => {
    await register(page, `${USER}t`, PASS);
    await login(page, `${USER}t`, PASS);
    await page.goto('/uploads');
    await page.waitForLoadState('load');

    const fileInput = page.locator('[data-testid="file-input-music"]');
    await fileInput.setInputFiles({
      name: 'wrong.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(100 * 1024 + 1, 0),
    });

    await expect(page.locator('[data-testid="upload-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-status"]')).toContainText('Only MP3, WAV, OGG, and M4A');
  });

  test('offline shows graceful error on public page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('load');
    // Block the auth/me check so the page treats the user as anonymous
    await page.route('/api/auth/me', route => route.fulfill({ status: 503, body: JSON.stringify({ error: 'offline' }) }));
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, .auth-title, [data-testid="login-username"]').first()).toBeVisible();
  });
});
