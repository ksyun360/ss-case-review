// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { DemoCasePage } from '../src/demo-case-page.tsx';

afterEach(() => cleanup());

test('lets a reviewer move through every fictional demo view', async () => {
  const user = userEvent.setup();
  render(<DemoCasePage />);

  expect(screen.getByRole('heading', { name: 'Case summary' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Open Plaintiff’s brief · page 9' }));
  expect(screen.getByRole('heading', { name: 'Plaintiff brief · page 9' })).toBeVisible();
  expect(
    screen.getByText(
      /the ALJ failed to explain why the longitudinal treatment record was discounted/i,
    ),
  ).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Open Commissioner’s brief · page 14' }));
  expect(screen.getByRole('heading', { name: 'Commissioner brief · page 14' })).toBeVisible();
  expect(screen.getByText(/the ALJ reasonably evaluated the longitudinal record/i)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Open ALJ decision · page 6' }));
  expect(screen.getByRole('document', { name: /fictional PDF preview/i })).toBeVisible();
  expect(
    screen.getByText(
      'The residual functional capacity permits sedentary work with occasional postural activities.',
    ),
  ).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  await user.click(screen.getByRole('button', { name: 'Medical chronology' }));
  expect(screen.getByRole('heading', { name: 'Medical chronology' })).toBeVisible();
  expect(screen.getByText('Hill Country Imaging')).toBeVisible();
  const medicalFilter = screen.getByRole('searchbox', { name: 'Filter medical chronology' });
  await user.type(medicalFilter, 'MRI');
  expect(screen.getByText('Hill Country Imaging')).toBeVisible();
  expect(screen.queryByText('Dr. Maya Chen, primary care')).not.toBeInTheDocument();
  await user.clear(medicalFilter);
  await user.type(medicalFilter, 'no matching entry');
  expect(screen.getByText('No matching chronology entries.')).toBeVisible();
  await user.clear(medicalFilter);
  await user.click(screen.getByRole('button', { name: 'Demo source · page 28' }));
  expect(screen.getByRole('heading', { name: 'Demo source · page 28' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Procedural chronology' }));
  expect(screen.getByRole('heading', { name: 'Procedural chronology' })).toBeVisible();
  expect(screen.getByText('ALJ decision issued')).toBeVisible();
  expect(screen.getAllByRole('row', { name: /ALJ/ }).length).toBeGreaterThan(0);

  const milestone = screen.getByRole('button', {
    name: 'Toggle milestone emphasis for 2021-09-02',
  });
  await user.click(milestone);
  expect(screen.getByRole('row', { name: /2021-09-02 ALJ decision issued/ })).not.toHaveClass(
    'important-event',
  );
  await user.click(milestone);
  expect(screen.getByRole('row', { name: /2021-09-02 ALJ decision issued/ })).toHaveClass(
    'important-event',
  );
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Event group for 2021-09-02' }),
    'appeals',
  );
  expect(screen.getByRole('row', { name: /2021-09-02 ALJ decision issued/ })).toHaveClass(
    'event-group-appeals',
  );

  await user.click(screen.getByRole('button', { name: 'Five-step + RFC' }));
  expect(screen.getByRole('heading', { name: 'Five-step review and RFC' })).toBeVisible();
  expect(
    screen.getByText(
      'The vocational expert identified three sedentary occupations available under the RFC.',
    ),
  ).toBeVisible();
  await user.click(
    screen.getByRole('button', { name: 'Verify quote · Hearing transcript · page 72' }),
  );
  expect(screen.getByRole('heading', { name: 'Hearing transcript · page 72' })).toBeVisible();
});

test('shows representative case metadata beside the source-linked review', async () => {
  const user = userEvent.setup();
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<DemoCasePage />);

  expect(screen.getByRole('heading', { name: 'Case profile' })).toBeVisible();
  expect(screen.getByText('Alleged onset date')).toBeVisible();
  expect(screen.getByText('January 14, 2019')).toBeVisible();
  expect(screen.getByText('Date last insured')).toBeVisible();
  expect(screen.getByText('December 31, 2024')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open PDF in new tab' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Open PDF in new tab' }));
  expect(open).toHaveBeenCalledWith(
    expect.stringContaining('data:application/pdf'),
    '_blank',
    'noopener,noreferrer',
  );
  open.mockRestore();
});

test('opens a substantive fictional multi-page record PDF', async () => {
  const user = userEvent.setup();
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<DemoCasePage />);

  await user.click(screen.getByRole('button', { name: 'Open PDF in new tab' }));

  const pdfUrl = open.mock.calls[0]?.[0];
  expect(typeof pdfUrl).toBe('string');
  const encodedDocument = (pdfUrl as string).split(',')[1] ?? '';
  const document = decodeURIComponent(encodedDocument);
  expect(document).toContain('/Count 3');
  expect(document).toContain('ALJ DECISION');
  expect(document).toContain('MEDICAL EVIDENCE');
  expect(document).toContain('PLAINTIFF BRIEF');
  open.mockRestore();
});

test('records a local correction suggestion without replacing the source value', async () => {
  const user = userEvent.setup();
  render(<DemoCasePage />);

  await user.click(screen.getByRole('button', { name: 'Medical chronology' }));
  await user.click(screen.getByRole('button', { name: 'Suggest correction for 2020-08-03' }));
  expect(screen.getByRole('textbox', { name: 'Correction suggestion' })).toBeVisible();
  await user.type(
    screen.getByRole('textbox', { name: 'Correction suggestion' }),
    'Confirm the imaging date against the report header.',
  );
  await user.click(screen.getByRole('button', { name: 'Save correction suggestion' }));

  expect(screen.getByText('Correction suggestion recorded locally for review.')).toBeVisible();
  expect(screen.getByText('Confirm the imaging date against the report header.')).toBeVisible();
  expect(screen.getByText('Hill Country Imaging')).toBeVisible();
});

test('provides curated medical and legal reference links without treating them as evidence', () => {
  render(<DemoCasePage />);

  expect(screen.getByRole('heading', { name: 'Reference desk' })).toBeVisible();
  expect(screen.getByRole('link', { name: /Residual functional capacity/i })).toHaveAttribute(
    'href',
    'https://www.ecfr.gov/current/title-20/part-404/subpart-P/section-404.1545',
  );
  expect(screen.getByRole('link', { name: /Intervertebral disc disease/i })).toHaveAttribute(
    'href',
    'https://medlineplus.gov/genetics/condition/intervertebral-disc-disease/',
  );
  expect(screen.getByText(/Reference material is not case evidence/i)).toBeVisible();
});
