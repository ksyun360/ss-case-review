import { expect, test } from 'vitest';
import viteConfig from '../../../vite.config.ts';

test('proxies development case requests to the loopback API with the API Host', () => {
  expect(viteConfig.server?.proxy?.['/api/v1']).toEqual({
    target: 'http://127.0.0.1:5176',
    changeOrigin: true,
  });
});
