import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from '../src/app.tsx';

test('renders the shared navigation and preview notice around the home route', () => {
  expect(
    renderToStaticMarkup(
      <MemoryRouter initialEntries={['/home']}>
        <App />
      </MemoryRouter>,
    ),
  ).toMatchSnapshot();
});
