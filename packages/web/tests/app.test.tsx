import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from '../src/app.tsx';

test('describes the metadata-only preview accurately across routes', () => {
  const home = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/home']}>
      <App />
    </MemoryRouter>,
  );
  const cases = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/cases']}>
      <App />
    </MemoryRouter>,
  );
  expect(home).toContain('Synthetic case metadata can be listed');
  expect(home).toContain('Select synthetic documents locally');
  expect(cases).toContain('Browse synthetic case drafts');
  expect(home).not.toContain('Case storage is not connected');
  expect(home).not.toContain('Saved cases will appear here after case storage');
});

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
