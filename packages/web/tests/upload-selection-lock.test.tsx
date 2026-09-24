// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import {
  createSyntheticCase,
  getSyntheticUploadCapability,
  uploadSyntheticOriginal,
  type SyntheticOriginalReceipt,
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

test('locks selected files and the case label once synthetic registration starts', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  vi.mocked(getSyntheticUploadCapability).mockResolvedValue(true);
  vi.mocked(createSyntheticCase).mockResolvedValue({
    caseId,
    label: 'Synthetic appeal',
    recordRevision: 1,
  });
  let resolveUpload!: (receipt: SyntheticOriginalReceipt) => void;
  vi.mocked(uploadSyntheticOriginal).mockImplementation(
    () => new Promise((resolve) => (resolveUpload = resolve)),
  );
  const user = userEvent.setup();
  render(<UploadPage />);
  expect(await screen.findByText('Synthetic original transfer is available.')).toBeVisible();
  const chooser = screen.getByLabelText('Choose case documents');
  const label = screen.getByRole('textbox', { name: 'Synthetic case label' });
  await user.upload(chooser, new File(['one'], 'one.pdf', { type: 'application/pdf' }));
  await user.type(label, 'Synthetic appeal');
  const submit = screen.getByRole('button', { name: 'Register synthetic originals' });
  expect(fireEvent.submit(submit.closest('form') as HTMLFormElement)).toBe(false);
  expect(chooser).toBeDisabled();
  expect(label).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove one.pdf' })).toBeDisabled();
  await waitFor(() => expect(uploadSyntheticOriginal).toHaveBeenCalledTimes(1));
  resolveUpload({ caseId, documentVersionId: 'v1', sha256: 'a'.repeat(64), byteLength: 3 });
  expect(await screen.findByText('1 of 1 originals registered')).toBeVisible();
  expect(chooser).toBeDisabled();
  expect(label).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove one.pdf' })).toBeDisabled();
});
