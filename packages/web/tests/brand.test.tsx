import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { Brand } from '../src/brand.tsx';

test('renders the approved product identity as an accessible home link', () => {
  expect(renderToStaticMarkup(<Brand />)).toBe(
    '<a class="brand" href="/home" aria-label="Record Review home">' +
      '<span class="brand-symbol" aria-hidden="true"></span>' +
      '<span><span class="brand-name">Record Review</span>' +
      '<span class="brand-descriptor">Social Security appeals</span></span></a>',
  );
});
