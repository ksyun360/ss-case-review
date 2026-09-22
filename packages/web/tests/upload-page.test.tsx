import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { UploadPage } from '../src/upload-page.tsx';

test('renders a labeled local-only document selection screen', () => {
  expect(renderToStaticMarkup(<UploadPage />)).toMatchSnapshot();
});
