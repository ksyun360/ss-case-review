import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { HomePage } from '../src/home-page.tsx';

test('renders the empty case workspace with the two starting actions', () => {
  expect(renderToStaticMarkup(<HomePage />)).toMatchSnapshot();
});
