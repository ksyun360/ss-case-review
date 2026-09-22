import { expect, test } from '@playwright/test';

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
