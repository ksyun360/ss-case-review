// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { UploadPage } from '../src/upload-page.tsx';

afterEach(cleanup);

test('keeps earlier selections when another batch of documents is chosen', async () => {
  const user = userEvent.setup();
  render(<UploadPage />);
  const chooser = screen.getByLabelText('Choose case documents');
  await user.upload(chooser, new File(['one'], 'first.pdf', { type: 'application/pdf' }));
  await user.upload(chooser, new File(['two'], 'second.pdf', { type: 'application/pdf' }));

  const documents = within(screen.getByRole('list', { name: 'Selected documents' }));
  expect(documents.getAllByRole('listitem')).toHaveLength(2);
  expect(documents.getByText('first.pdf')).toBeVisible();
  expect(documents.getByText('second.pdf')).toBeVisible();
});

test('lists selected file names and sizes without enabling processing', async () => {
  const user = userEvent.setup();
  render(<UploadPage />);

  await user.upload(screen.getByLabelText('Choose case documents'), [
    new File(['abc'], 'synthetic-brief.pdf', { type: 'application/pdf' }),
    new File(['123456789'], 'synthetic-record.tiff', { type: 'image/tiff' }),
  ]);

  const documents = within(screen.getByRole('list', { name: 'Selected documents' }));
  const rows = documents.getAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent('synthetic-brief.pdf');
  expect(rows[0]).toHaveTextContent('3 bytes');
  expect(rows[1]).toHaveTextContent('synthetic-record.tiff');
  expect(rows[1]).toHaveTextContent('9 bytes');
  expect(screen.getByRole('button', { name: 'Upload and process' })).toBeDisabled();
});
