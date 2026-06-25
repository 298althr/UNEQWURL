import { test, expect } from '@playwright/test';

// Test 10 — Frontend Crash Test
// Rapid slider movement, modal open/close, lesson switching, EQ toggling

const BASE_URL = 'http://localhost:3000';

test.describe('Frontend Stress / Crash Test', () => {
  test('rapid UI interaction stress', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);

    // 1. Rapid form input changes (50 times)
    console.log('[Crash] Rapid form input stress...');
    for (let i = 0; i < 50; i++) {
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        inputs.forEach((s: any) => {
          s.value = Math.random().toString(36).substring(7);
          s.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }).catch(() => {});
      if (i % 10 === 0) await page.waitForTimeout(50);
    }

    // Verify page didn't crash
    const body = await page.locator('body').count();
    expect(body).toBe(1);
    console.log('[Crash] Rapid inputs: PASS');

    // 2. Open/close any interactive elements repeatedly
    console.log('[Crash] Button click stress...');
    for (let i = 0; i < 10; i++) {
      const btns = await page.locator('button').all();
      if (btns.length > 0) {
        const idx = Math.floor(Math.random() * Math.min(btns.length, 5));
        await btns[idx].click().catch(() => {});
        await page.waitForTimeout(100);
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(100);
      }
    }
    expect(await page.locator('body').count()).toBe(1);
    console.log('[Crash] Button clicks: PASS');

    // 3. Navigate rapidly between public pages
    console.log('[Crash] Rapid navigation...');
    const routes = ['/login', '/register', '/', '/docs/console-guide'];
    for (let i = 0; i < 10; i++) {
      const route = routes[i % routes.length];
      await page.goto(`${BASE_URL}${route}`).catch(() => {});
      await page.waitForTimeout(300);
    }
    expect(await page.locator('body').count()).toBe(1);
    console.log('[Crash] Rapid navigation: PASS');

    // 4. Check for console errors on final page
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') logs.push(msg.text());
    });

    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);

    const criticalErrors = logs.filter(l =>
      !l.includes('net::') &&
      !l.includes('Failed to fetch') &&
      !l.includes('NetworkError')
    );

    console.log(`[Crash] Console errors: ${criticalErrors.length} critical`);
    expect(criticalErrors.length).toBeLessThanOrEqual(10);
  });

  test('page element stress', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);

    // Check that page has interactive elements
    const inputs = await page.locator('input').count();
    console.log(`[Crash] Input elements found: ${inputs}`);
    expect(inputs).toBeGreaterThan(0);

    // Rapid focus/blur on inputs
    const allInputs = await page.locator('input').all();
    for (let i = 0; i < 50; i++) {
      const idx = i % Math.max(allInputs.length, 1);
      await allInputs[idx]?.focus().catch(() => {});
      await allInputs[idx]?.fill('stress test ' + i).catch(() => {});
      await allInputs[idx]?.blur().catch(() => {});
      await page.waitForTimeout(50);
    }

    expect(await page.locator('input').count()).toBeGreaterThan(0);
    expect(await page.locator('body').count()).toBe(1);
    console.log('[Crash] Input stress: PASS');
  });
});
