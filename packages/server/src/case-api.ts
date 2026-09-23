import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import {
  createCase,
  listCasesForReviewer,
  type SqlClient,
} from '@record-review/case-repository/cases';
import type { ServerEnvironment } from '@record-review/server-config/gemini-development';
import { readDevelopmentIdentity } from '@record-review/server-config/development-identity';

export function createDevelopmentApi(environment: ServerEnvironment, database: SqlClient) {
  const identity = readDevelopmentIdentity(environment);
  const api = Fastify();
  api.get('/api/v1/cases', async () => ({
    cases: await listCasesForReviewer(database, identity.reviewerId),
  }));
  api.post<{ Body: { label: string } }>('/api/v1/cases', async (request, reply) => {
    const created = await createCase(database, {
      caseId: randomUUID(),
      label: request.body.label.trim(),
      reviewerId: identity.reviewerId,
    });
    return reply.code(201).send({ case: created });
  });
  return api;
}
