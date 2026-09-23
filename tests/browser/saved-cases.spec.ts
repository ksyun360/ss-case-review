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

test('creates and opens a synthetic draft at mobile width without uploading files', async ({
  page,
}) => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const draft = { caseId, label: 'Synthetic mobile draft', recordRevision: 1 };
  let saved = false;
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route('**/api/v1/cases', async (route) => {
    expect(route.request().headers()['x-record-review-client']).toBe('synthetic-workspace');
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ label: draft.label });
      saved = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ case: draft }),
      });
      return;
    }
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cases: saved ? [draft] : [] }),
    });
  });
  await page.route(`**/api/v1/cases/${caseId}`, async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ case: draft }),
    });
  });

  await page.goto('/cases');
  await page.getByRole('textbox', { name: 'Synthetic case label' }).fill(draft.label);
  await page.getByRole('button', { name: 'Create synthetic draft' }).click();
  await page.getByRole('link', { name: draft.label }).click();
  await expect(page.getByRole('heading', { name: draft.label })).toBeVisible();
  await expect(
    page.getByText('No documents have been uploaded for this synthetic draft.'),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
