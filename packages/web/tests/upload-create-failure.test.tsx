// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import {
  createSyntheticCase,
  getSyntheticUploadCapability,
  uploadSyntheticOriginal,
} from '../src/case-client.ts';
import { UploadPage } from '../src/upload-page.tsx';

vi.mock('../src/case-client.ts', () => ({
  getSyntheticUploadCapability: vi.fn(),
  createSyntheticCase: vi.fn(),
  uploadSyntheticOriginal: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('warns that a failed draft creation may have succeeded and blocks duplicate submission', async () => {
  vi.mocked(getSyntheticUploadCapability).mockResolvedValue(true);
  vi.mocked(createSyntheticCase).mockRejectedValue(new Error('connection lost'));
  const user = userEvent.setup();
  render(<UploadPage />);
  expect(await screen.findByText('Synthetic original transfer is available.')).toBeVisible();
  await user.upload(
    screen.getByLabelText('Choose case documents'),
    new File(['synthetic'], 'synthetic.pdf', { type: 'application/pdf' }),
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Synthetic case label' }),
    'Synthetic appeal',
  );
  const submit = screen.getByRole('button', { name: 'Register synthetic originals' });
  expect(submit).toBeEnabled();
  expect(fireEvent.submit(submit.closest('form') as HTMLFormElement)).toBe(false);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Draft creation could not be confirmed. Check saved cases before trying again.',
  );
  expect(screen.getByRole('link', { name: 'Check saved cases' })).toHaveAttribute('href', '/cases');
  expect(submit).toBeDisabled();
  expect(createSyntheticCase).toHaveBeenCalledTimes(1);
  expect(uploadSyntheticOriginal).not.toHaveBeenCalled();
});
