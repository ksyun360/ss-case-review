import { expect, test } from '@playwright/test';

test('keeps document selection and removal free of network requests', async ({ page }) => {
  await page.goto('/upload');
  await expect(page.getByRole('heading', { name: 'Prepare a case record' })).toBeVisible();

  const requests: string[] = [];
  await page.route('**/*', async (route) => {
    requests.push(`${route.request().method()} ${route.request().url()}`);
    await route.abort();
  });

  await page.getByLabel('Choose case documents').setInputFiles({
    name: 'synthetic-privacy-check.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('Synthetic privacy fixture; no court information'),
  });
  const documents = page.getByRole('list', { name: 'Selected documents' });
  await expect(documents.getByRole('listitem')).toHaveCount(1);
  await expect(documents).toContainText('synthetic-privacy-check.pdf');
  await expect(page.getByRole('button', { name: 'Upload and process' })).toBeDisabled();

  await page.getByRole('button', { name: 'Remove synthetic-privacy-check.pdf' }).click();
  await expect(documents.getByRole('listitem')).toHaveCount(0);
  expect(requests).toEqual([]);
});
