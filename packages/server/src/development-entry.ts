import process from 'node:process';
import { startDevelopmentServer } from './development-server.ts';

try {
  const api = await startDevelopmentServer(process.env);
  const shutdown = async () => {
    await api.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.stdout.write('Synthetic case API listening at http://127.0.0.1:5176\n');
} catch {
  process.stderr.write('development_server_start_failed\n');
  process.exitCode = 1;
}
