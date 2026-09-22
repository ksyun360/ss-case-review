import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from '../src/app.tsx';

test('provides a recovery page for an unknown address', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/missing']}>
      <App />
    </MemoryRouter>,
  );
  expect(html).toContain('<h1>Page not found</h1>');
  expect(html).toContain('<main id="main-content" class="page" tabindex="-1">');
  expect(html).toContain('href="/home">Return to workspace</a>');
});

test('opens the /cases route directly', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/cases']}>
      <App />
    </MemoryRouter>,
  );
  expect(html).toContain('<h1>Existing cases</h1>');
});

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
