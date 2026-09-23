import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test('keeps the saved-case empty state and recovery action accessible', async ({ page }) => {
  await page.goto('/cases');
  await expect(page.getByRole('heading', { name: 'Case storage is not connected' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Saved cases', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('link', { name: 'Prepare a case record', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Prepare a case record' })).toBeVisible();
});

test('passes the automated home workspace accessibility scan', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Your case workspace' })).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('keeps a populated mobile document manifest accessible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/upload');
  const filename = 'synthetic-medical-record-with-a-long-unbroken-reference-1234567890.pdf';
  await page.getByLabel('Choose case documents').setInputFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: Buffer.from('Synthetic example only'),
  });
  await expect(page.getByRole('list', { name: 'Selected documents' })).toContainText(filename);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('button', { name: `Remove ${filename}` }).click();
  await expect(
    page.getByRole('list', { name: 'Selected documents' }).getByRole('listitem'),
  ).toHaveCount(0);
});

test('keeps the home-to-upload workflow usable at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/home');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const cards = await page.locator('.start-card').evaluateAll((elements) =>
    elements.map((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      return { top, bottom };
    }),
  );
  expect(cards[1]?.top).toBeGreaterThan(cards[0]?.bottom ?? 0);
  await page.getByRole('link', { name: 'Upload case record', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prepare a case record' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await expect(page.getByLabel('Choose case documents')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload and process' })).toBeDisabled();
});

test('renders the approved desktop workspace with a visible keyboard skip link', async ({
  page,
}) => {
  await page.goto('/home');
  await expect(page).toHaveTitle('Record Review | Social Security appeals');
  await expect(page.getByRole('heading', { name: 'Your case workspace' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 245, 241)');
  await expect(page.getByRole('link', { name: 'Upload case record', exact: true })).toHaveCSS(
    'min-height',
    '44px',
  );
  const cards = await page.locator('.start-card').evaluateAll((elements) =>
    elements.map((element) => {
      const { top, left, width } = element.getBoundingClientRect();
      return { top, left, width };
    }),
  );
  expect(cards).toHaveLength(2);
  expect(cards[0]?.top).toBe(cards[1]?.top);
  expect(cards[1]?.left).toBeGreaterThan((cards[0]?.left ?? 0) + (cards[0]?.width ?? 0));
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await expect(skip).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});
