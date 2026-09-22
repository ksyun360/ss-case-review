import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { CasesPage } from '../src/cases-page.tsx';

test('renders an honest saved-case empty state without fabricated records', () => {
  expect(renderToStaticMarkup(<CasesPage />)).toMatchSnapshot();
});
