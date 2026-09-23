import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { CasesPage } from '../src/cases-page.tsx';

test('renders a saved-case loading state without fabricated records', () => {
  expect(renderToStaticMarkup(<CasesPage />)).toMatchSnapshot();
});
