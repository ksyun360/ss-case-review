// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

test('registers two selected synthetic originals in one draft with per-file progress', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const first = new File(['first'], 'synthetic-brief.pdf', { type: 'application/pdf' });
  const second = new File(['second'], 'synthetic-record.tiff', { type: 'image/tiff' });
  vi.mocked(getSyntheticUploadCapability).mockResolvedValue(true);
  vi.mocked(createSyntheticCase).mockResolvedValue({
    caseId,
    label: 'Synthetic appeal',
    recordRevision: 1,
  });
  let resolveFirst!: (receipt: SyntheticOriginalReceipt) => void;
  let resolveSecond!: (receipt: SyntheticOriginalReceipt) => void;
  vi.mocked(uploadSyntheticOriginal)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );
  const user = userEvent.setup();
  render(<UploadPage />);
  expect(await screen.findByText('Synthetic original transfer is available.')).toBeVisible();
  const save = screen.getByRole('button', { name: 'Register synthetic originals' });
  expect(save).toBeDisabled();
  const label = screen.getByRole('textbox', { name: 'Synthetic case label' });
  await user.type(label, 'Synthetic appeal');
  expect(save).toBeDisabled();
  await user.clear(label);
  await user.type(label, '   ');
  await user.upload(screen.getByLabelText('Choose case documents'), [first, second]);
  expect(save).toBeDisabled();
  const documents = within(screen.getByRole('list', { name: 'Selected documents' }));
  expect(documents.getAllByRole('listitem')[0]).toHaveTextContent('Ready');
  expect(documents.getAllByRole('listitem')[1]).toHaveTextContent('Ready');
  await user.type(label, 'Synthetic appeal  ');
  expect(save).toBeEnabled();
  expect(fireEvent.submit(save.closest('form') as HTMLFormElement)).toBe(false);
  await waitFor(() => expect(uploadSyntheticOriginal).toHaveBeenCalledTimes(1));
  expect(createSyntheticCase).toHaveBeenCalledExactlyOnceWith('Synthetic appeal');
  expect(uploadSyntheticOriginal).toHaveBeenNthCalledWith(1, caseId, first);
  expect(save).toBeDisabled();
  resolveFirst({ caseId, documentVersionId: 'v1', sha256: 'a'.repeat(64), byteLength: first.size });
  await waitFor(() => expect(uploadSyntheticOriginal).toHaveBeenCalledTimes(2));
  expect(uploadSyntheticOriginal).toHaveBeenNthCalledWith(2, caseId, second);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByText('1 of 2 originals registered')).toBeVisible();
  expect(documents.getAllByRole('listitem')[0]).toHaveTextContent('Registered');
  expect(documents.getAllByRole('listitem')[1]).toHaveTextContent('Ready');
  resolveSecond({
    caseId,
    documentVersionId: 'v2',
    sha256: 'b'.repeat(64),
    byteLength: second.size,
  });
  expect(await screen.findByText('2 of 2 originals registered')).toBeVisible();
  expect(save).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Open synthetic case' })).toHaveAttribute(
    'href',
    `/cases/${caseId}`,
  );
  expect(screen.getByText('Extraction and review are not available yet.')).toBeVisible();
});
