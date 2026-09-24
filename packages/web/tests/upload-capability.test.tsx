// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { getSyntheticUploadCapability } from '../src/case-client.ts';
import { UploadPage } from '../src/upload-page.tsx';

vi.mock('../src/case-client.ts', () => ({ getSyntheticUploadCapability: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('shows whether synthetic original transfer is available without enabling processing', async () => {
  vi.mocked(getSyntheticUploadCapability).mockResolvedValueOnce(true);
  render(<UploadPage />);
  expect(await screen.findByText('Synthetic original transfer is available.')).toBeVisible();
  expect(getSyntheticUploadCapability).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Upload and process' })).toBeDisabled();

  cleanup();
  vi.mocked(getSyntheticUploadCapability).mockClear();
  vi.mocked(getSyntheticUploadCapability).mockResolvedValueOnce(false);
  render(<UploadPage />);
  expect(await screen.findByText('Synthetic original transfer is not configured.')).toBeVisible();
  expect(getSyntheticUploadCapability).toHaveBeenCalledTimes(1);

  cleanup();
  vi.mocked(getSyntheticUploadCapability).mockClear();
  vi.mocked(getSyntheticUploadCapability).mockRejectedValueOnce(new Error('synthetic offline'));
  render(<UploadPage />);
  expect(
    await screen.findByText('Synthetic original transfer status is unavailable.'),
  ).toBeVisible();
  expect(getSyntheticUploadCapability).toHaveBeenCalledTimes(1);
});
