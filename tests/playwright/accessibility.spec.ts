import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_PAGES = ['/', '/login', '/register', '/docs/console-guide'];

const AXE_RULES = [
  'color-contrast',
  'aria-required-attr',
  'aria-required-children',
  'aria-roles',
  'button-name',
  'image-alt',
  'label',
  'link-name',
];

for (const path of PUBLIC_PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('load');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(AXE_RULES)
      .analyze();

    const critical = accessibilityScanResults.violations.filter(v => v.impact === 'critical');
    const serious = accessibilityScanResults.violations.filter(v => v.impact === 'serious');
    console.log(`[a11y] ${path}: ${accessibilityScanResults.violations.length} violations`);
    if (critical.length > 0 || serious.length > 0) {
      console.log(JSON.stringify(accessibilityScanResults.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })), null, 2));
    }
    expect(critical).toHaveLength(0);
    expect(serious).toHaveLength(0);
  });
}

test('a11y: keyboard navigation on login', async ({ page }) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  expect(focused).toBeTruthy();
});
