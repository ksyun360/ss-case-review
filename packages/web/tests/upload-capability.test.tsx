// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { getSyntheticUploadCapability } from '../src/case-client.ts';
import { UploadPage } from '../src/upload-page.tsx';

vi.mock('../src/case-client.ts', () => ({ getSyntheticUploadCapability: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('shows whether synthetic original transfer is available without enabling processing', async () => {
  let resolveCapability!: (enabled: boolean) => void;
  vi.mocked(getSyntheticUploadCapability).mockImplementationOnce(
    () => new Promise((resolve) => (resolveCapability = resolve)),
  );
  const user = userEvent.setup();
  render(<UploadPage />);
  await user.upload(
    screen.getByLabelText('Choose case documents'),
    new File(['sample'], 'synthetic.pdf', { type: 'application/pdf' }),
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Synthetic case label' }),
    'Synthetic appeal',
  );
  expect(screen.getByRole('button', { name: 'Register synthetic originals' })).toBeDisabled();
  resolveCapability(true);
  expect(await screen.findByText('Synthetic original transfer is available.')).toBeVisible();
  expect(getSyntheticUploadCapability).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Register synthetic originals' })).toBeEnabled();

  cleanup();
  vi.mocked(getSyntheticUploadCapability).mockClear();
  vi.mocked(getSyntheticUploadCapability).mockResolvedValueOnce(false);
  render(<UploadPage />);
  await user.upload(
    screen.getByLabelText('Choose case documents'),
    new File(['sample'], 'synthetic.pdf', { type: 'application/pdf' }),
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Synthetic case label' }),
    'Synthetic appeal',
  );
  expect(await screen.findByText('Synthetic original transfer is not configured.')).toBeVisible();
  expect(getSyntheticUploadCapability).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Register synthetic originals' })).toBeDisabled();

  cleanup();
  vi.mocked(getSyntheticUploadCapability).mockClear();
  vi.mocked(getSyntheticUploadCapability).mockRejectedValueOnce(new Error('synthetic offline'));
  render(<UploadPage />);
  await user.upload(
    screen.getByLabelText('Choose case documents'),
    new File(['sample'], 'synthetic.pdf', { type: 'application/pdf' }),
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Synthetic case label' }),
    'Synthetic appeal',
  );
  expect(
    await screen.findByText('Synthetic original transfer status is unavailable.'),
  ).toBeVisible();
  expect(getSyntheticUploadCapability).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Register synthetic originals' })).toBeDisabled();
});
