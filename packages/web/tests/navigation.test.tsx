// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, test } from 'vitest';
import { App } from '../src/app.tsx';

afterEach(cleanup);

test('moves focus to each new page after in-app navigation without taking initial focus', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/home']}>
      <App />
    </MemoryRouter>,
  );
  expect(document.body).toHaveFocus();

  await user.click(screen.getByRole('link', { name: 'Upload record' }));
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Prepare a case record' })).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Saved cases' }));
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Existing cases' })).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Workspace' }));
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Your case workspace' })).toBeVisible();
});

test('opens the home workspace from the root address', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Your case workspace' })).toBeInTheDocument();
});
