import { test, expect } from '@playwright/test';
import { register, login, logout } from './helpers';

const USER = `s${Date.now().toString(36).slice(0, 8)}`;
const PASS = 'SecurePass123!';

test.describe('Security suite', () => {
  test('audio-proxy rejects non-whitelisted hosts', async ({ page }) => {
    await register(page, `${USER}p`, PASS);
    await login(page, `${USER}p`, PASS);

    const res = await page.request.get('/api/audio-proxy?url=https://evil.example.com/secret.mp3');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not on proxy whitelist|blocked/i);
  });

  test('audio-proxy blocks private/internal destinations', async ({ page }) => {
    await register(page, `${USER}q`, PASS);
    await login(page, `${USER}q`, PASS);

    const res = await page.request.get('/api/audio-proxy?url=http://localhost:3000/admin');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/blocked|insecure/i);
  });

  test('admin endpoints return 403 for regular users', async ({ page }) => {
    await register(page, `${USER}r`, PASS);
    await login(page, `${USER}r`, PASS);

    const endpoints = ['/api/admin/songs', '/api/admin/uploads', '/api/admin/users', '/api/admin/controls'];
    for (const endpoint of endpoints) {
      const res = await page.request.get(endpoint);
      expect(res.status()).toBe(403);
    }
  });

  test('auth endpoints return no-cache headers', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', 'any');
    await page.fill('[data-testid="login-password"]', 'any');
    const [res] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/login')),
      page.click('[data-testid="login-submit"]'),
    ]);
    const cache = res.headers()['cache-control'];
    expect(cache).toMatch(/no-store/);
  });

  test('dashboard has security headers via middleware', async ({ page, request }) => {
    await register(page, `${USER}h`, PASS);
    await login(page, `${USER}h`, PASS);
    const res = await request.get('/dashboard');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['x-frame-options']).toBe('DENY');
    expect(res.headers()['content-security-policy']).toBeTruthy();
  });

  test('logout invalidates all protected requests', async ({ page }) => {
    await register(page, `${USER}l`, PASS);
    await login(page, `${USER}l`, PASS);
    await logout(page);

    const me = await page.request.get('/api/auth/me');
    expect(me.status()).toBe(401);

    const uploads = await page.request.get('/api/uploads');
    expect(uploads.status()).toBe(401);
  });
});
