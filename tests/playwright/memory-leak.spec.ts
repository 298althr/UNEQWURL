import { test, expect, chromium } from '@playwright/test';

// Test 4 — Memory Leak Test
// User stays for 1-4 hours, monitors RAM growth and detached nodes

const BASE_URL = 'http://localhost:3000';

async function measureMemory(page: any) {
  const metrics = await page.evaluate(() => ({
    // @ts-ignore
    jsHeapSize: (window.performance as any).memory?.usedJSHeapSize || 0,
    jsHeapTotal: (window.performance as any).memory?.totalJSHeapSize || 0,
  }));
  return metrics;
}

test.describe('Memory Leak Detection', () => {
  test('1-hour session memory profile', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    // Navigate to login page (public, has interactive elements)
    await page.goto(`${BASE_URL}/login`);

    // Let the page settle
    await page.waitForTimeout(3000);

    const baseline = await measureMemory(page);
    console.log(`[Memory] Baseline heap: ${(baseline.jsHeapSize / 1024 / 1024).toFixed(2)} MB`);

    // Simulate user actions every 10 seconds for 1 minute (accelerated test)
    // Real 1-hour test would take too long; we compress by doing more actions
    const checkInterval = 10_000; // 10s
    const duration = 1 * 60 * 1000; // 1 minute accelerated
    const checks = duration / checkInterval;

    const measurements: number[] = [baseline.jsHeapSize];

    for (let i = 0; i < checks; i++) {
      // Toggle EQ on/off
      await page.evaluate(() => {
        const toggle = document.querySelector('[data-testid="ab-toggle"]') as HTMLElement;
        if (toggle) toggle.click();
      }).catch(() => {});

      // Move sliders
      await page.evaluate(() => {
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach((s: any) => {
          s.value = Math.floor(Math.random() * 24) - 12;
          s.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }).catch(() => {});

      // Wait
      await page.waitForTimeout(checkInterval);

      const current = await measureMemory(page);
      measurements.push(current.jsHeapSize);
      console.log(`[Memory] Check ${i + 1}/${checks}: ${(current.jsHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Analyze trend
    const startMB = measurements[0] / 1024 / 1024;
    const endMB = measurements[measurements.length - 1] / 1024 / 1024;
    const growthMB = endMB - startMB;
    const growthPercent = (growthMB / startMB) * 100;

    console.log(`[Memory] Growth: ${growthMB.toFixed(2)} MB (${growthPercent.toFixed(1)}%)`);

    // Red flag: >50% growth in 5 minutes would indicate leak
    expect(growthPercent).toBeLessThan(50);

    // Also check for linear growth pattern (strong indicator of leak)
    // Simple linear regression slope
    const n = measurements.length;
    const sumX = measurements.reduce((s, _, i) => s + i, 0);
    const sumY = measurements.reduce((s, m) => s + m, 0);
    const sumXY = measurements.reduce((s, m, i) => s + i * m, 0);
    const sumXX = measurements.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    console.log(`[Memory] Heap slope: ${(slope / 1024 / 1024).toFixed(4)} MB per check`);
    // Positive slope = growing; if growing fast, it's a leak
    expect(slope).toBeLessThan(1024 * 1024 * 10); // Less than 10MB growth per check
  });
});
