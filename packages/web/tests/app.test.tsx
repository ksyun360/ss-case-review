import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from '../src/app.tsx';

test('describes the synthetic transfer limits accurately across routes', () => {
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
  expect(home).toContain('Local original registration requires a configured API');
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

test('opens the self-contained fictional demo case without API data', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/demo']}>
      <App />
    </MemoryRouter>,
  );
  expect(html).toContain('Jordan Ellis — lumbar impairment appeal');
  expect(html).toContain('Medical chronology');
  expect(html).toContain('Five-step + RFC');
  expect(html).toContain('fictional');
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
