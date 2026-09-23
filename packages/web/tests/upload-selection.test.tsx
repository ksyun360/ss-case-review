// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { UploadPage } from '../src/upload-page.tsx';

afterEach(cleanup);

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
