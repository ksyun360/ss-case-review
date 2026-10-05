// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { DemoCasePage } from '../src/demo-case-page.tsx';

afterEach(() => cleanup());

test('lets a reviewer move through every fictional demo view', async () => {
  const user = userEvent.setup();
  render(<DemoCasePage />);

  expect(screen.getByRole('heading', { name: 'Case summary' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Open Plaintiff’s brief · page 9' }));
  expect(screen.getByRole('heading', { name: 'Plaintiff brief · page 9' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Open Commissioner’s brief · page 14' }));
  expect(screen.getByRole('heading', { name: 'Commissioner brief · page 14' })).toBeVisible();
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
  await user.click(screen.getByRole('button', { name: 'Demo source · page 28' }));
  expect(screen.getByRole('heading', { name: 'Demo source · page 28' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Procedural chronology' }));
  expect(screen.getByRole('heading', { name: 'Procedural chronology' })).toBeVisible();
  expect(screen.getByText('ALJ decision issued')).toBeVisible();
  expect(screen.getAllByRole('row', { name: /ALJ/ }).length).toBeGreaterThan(0);

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
