import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyError } from 'fastify';
import {
  createCase,
  listCasesForReviewer,
  type SqlClient,
} from '@record-review/case-repository/cases';
import type { ServerEnvironment } from '@record-review/server-config/gemini-development';
import { readDevelopmentIdentity } from '@record-review/server-config/development-identity';

export function createDevelopmentApi(environment: ServerEnvironment, database: SqlClient) {
  const identity = readDevelopmentIdentity(environment);
  const api = Fastify({
    bodyLimit: 4096,
    ajv: { customOptions: { coerceTypes: false, removeAdditional: false } },
  });
  api.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (
      request.headers['x-record-review-client'] !== 'synthetic-workspace' ||
      request.headers.host !== '127.0.0.1:5176' ||
      (origin !== undefined && origin !== 'http://127.0.0.1:5175')
    ) {
      return reply.code(403).send({ code: 'development_request_forbidden' });
    }
  });
  api.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE')
      return reply.code(413).send({ code: 'request_too_large' });
    if (error.validation) return reply.code(400).send({ code: 'invalid_request' });
    return reply.code(503).send({ code: 'case_service_unavailable' });
  });
  api.get('/api/v1/cases', async () => ({
    cases: await listCasesForReviewer(database, identity.reviewerId),
  }));
  api.post<{ Body: { label: string } }>(
    '/api/v1/cases',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['label'],
          properties: { label: { type: 'string', pattern: '\\S', maxLength: 120 } },
        },
      },
    },
    async (request, reply) => {
      const created = await createCase(database, {
        caseId: randomUUID(),
        label: request.body.label.trim(),
        reviewerId: identity.reviewerId,
      });
      return reply.code(201).send({ case: created });
    },
  );
  return api;
}
