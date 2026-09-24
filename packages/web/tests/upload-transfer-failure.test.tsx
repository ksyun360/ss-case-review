// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

test('marks an unconfirmed original and stops later transfers while preserving the known draft', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const files = [
    new File(['one'], 'one.pdf', { type: 'application/pdf' }),
    new File(['two'], 'two.pdf', { type: 'application/pdf' }),
    new File(['three'], 'three.pdf', { type: 'application/pdf' }),
  ];
  vi.mocked(getSyntheticUploadCapability).mockResolvedValue(true);
  vi.mocked(createSyntheticCase).mockResolvedValue({
    caseId,
    label: 'Synthetic appeal',
    recordRevision: 1,
  });
  vi.mocked(uploadSyntheticOriginal)
    .mockResolvedValueOnce({
      caseId,
      documentVersionId: 'v1',
      sha256: 'a'.repeat(64),
      byteLength: 3,
    })
    .mockRejectedValueOnce(new Error('connection lost'));
  const user = userEvent.setup();
  render(<UploadPage />);
  expect(await screen.findByText('Synthetic original transfer is available.')).toBeVisible();
  await user.upload(screen.getByLabelText('Choose case documents'), files);
  await user.type(
    screen.getByRole('textbox', { name: 'Synthetic case label' }),
    'Synthetic appeal',
  );
  const submit = screen.getByRole('button', { name: 'Register synthetic originals' });
  expect(fireEvent.submit(submit.closest('form') as HTMLFormElement)).toBe(false);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'A file transfer could not be confirmed. The case may contain some originals. Do not retry this upload from this page.',
  );
  const rows = within(screen.getByRole('list', { name: 'Selected documents' })).getAllByRole(
    'listitem',
  );
  expect(rows[0]).toHaveTextContent('Registered');
  expect(rows[1]).toHaveTextContent('Unconfirmed');
  expect(rows[2]).toHaveTextContent('Ready');
  expect(screen.getByText('1 of 3 originals registered')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open synthetic case' })).toHaveAttribute(
    'href',
    `/cases/${caseId}`,
  );
  expect(submit).toBeDisabled();
  expect(uploadSyntheticOriginal).toHaveBeenCalledTimes(2);
  expect(uploadSyntheticOriginal).toHaveBeenNthCalledWith(2, caseId, files[1]);
});
