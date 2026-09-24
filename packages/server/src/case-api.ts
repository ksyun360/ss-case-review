import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyError } from 'fastify';
import {
  createCase,
  findCaseForReviewer,
  listCasesForReviewer,
  type SqlClient,
} from '@record-review/case-repository/cases';
import type { ServerEnvironment } from '@record-review/server-config/gemini-development';
import { readDevelopmentIdentity } from '@record-review/server-config/development-identity';
import { storeOriginalForReviewer } from './original-ingestion.ts';

export type SyntheticOriginalStorage = Readonly<{ root: string; maximumBytes: number }>;

export function createDevelopmentApi(
  environment: ServerEnvironment,
  database: SqlClient,
  originalStorage?: SyntheticOriginalStorage,
) {
  const identity = readDevelopmentIdentity(environment);
  const api = Fastify({
    bodyLimit: 4096,
    ajv: { customOptions: { coerceTypes: false, removeAdditional: false } },
  });
  api.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store');
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
    if (error.validation || error.code === 'FST_ERR_CTP_INVALID_JSON_BODY')
      return reply.code(400).send({ code: 'invalid_request' });
    return reply.code(503).send({ code: 'case_service_unavailable' });
  });
  api.get('/api/v1/cases', async () => ({
    cases: await listCasesForReviewer(database, identity.reviewerId),
  }));
  api.get<{ Params: { caseId: string } }>(
    '/api/v1/cases/:caseId',
    {
      schema: {
        params: {
          type: 'object',
          properties: { caseId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const found = await findCaseForReviewer(database, identity.reviewerId, request.params.caseId);
      if (!found) return reply.code(404).send({ code: 'case_not_found' });
      return { case: found };
    },
  );
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
  if (originalStorage) {
    api.addContentTypeParser('application/octet-stream', (_request, payload, done) => {
      done(null, payload);
    });
    api.post<{ Params: { caseId: string }; Body: AsyncIterable<Uint8Array> }>(
      '/api/v1/cases/:caseId/synthetic-originals',
      {
        schema: {
          params: {
            type: 'object',
            properties: { caseId: { type: 'string', format: 'uuid' } },
          },
        },
      },
      async (request, reply) => {
        const original = await storeOriginalForReviewer(
          database,
          identity.reviewerId,
          request.params.caseId,
          originalStorage.root,
          request.body,
          originalStorage.maximumBytes,
        );
        return reply.code(201).send({ original });
      },
    );
  }
  return api;
}
