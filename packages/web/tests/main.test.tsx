// @vitest-environment jsdom
import { BrowserRouter } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from '../src/app.tsx';

const { render, createRoot } = vi.hoisted(() => {
  const render = vi.fn();
  return { render, createRoot: vi.fn(() => ({ render })) };
});

vi.mock('react-dom/client', () => ({ createRoot }));
afterEach(() => document.body.replaceChildren());

test('mounts the routed application in the browser root', async () => {
  const container = document.createElement('div');
  container.id = 'root';
  document.body.append(container);

  await import('../src/main.tsx');

  expect(createRoot).toHaveBeenCalledExactlyOnceWith(container);
  expect(render).toHaveBeenCalledExactlyOnceWith(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
});
