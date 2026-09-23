import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders a source-free synthetic case list accessibly at 320 pixels', async ({ page }) => {
  const label = `Synthetic-record-${'x'.repeat(88)}`;
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route('**/api/v1/cases', async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers()['x-record-review-client']).toBe('synthetic-workspace');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cases: [
          {
            caseId: '00000000-0000-4000-8000-000000000001',
            label,
            recordRevision: 1,
          },
        ],
      }),
    });
  });

  await page.goto('/cases');
  await expect(page.getByRole('list', { name: 'Saved cases' })).toContainText(label);
  await expect(page.getByRole('list', { name: 'Saved cases' })).toContainText('Record revision 1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
