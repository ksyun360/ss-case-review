import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from '../src/app.tsx';

test('opens the /upload route directly', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/upload']}>
      <App />
    </MemoryRouter>,
  );
  expect(html).toContain('<h1>Prepare a case record</h1>');
});

test('renders the shared navigation and preview notice around the home route', () => {
  expect(
    renderToStaticMarkup(
      <MemoryRouter initialEntries={['/home']}>
        <App />
      </MemoryRouter>,
    ),
  ).toMatchSnapshot();
});
