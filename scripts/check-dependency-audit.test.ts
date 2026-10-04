import { expect, test, vi } from 'vitest';
import { runDependencyAudit, validateDependencyAudits } from './check-dependency-audit.ts';

test('permits only documented unpatched development advisories while rejecting unsafe audit results', () => {
  const clean = {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { vulnerabilities: { high: 0, critical: 0 } },
  };
  const callableReport = Object.assign(() => undefined, clean);
  const callableCause = Object.assign(() => undefined, {
    url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
  });
  const allowed = {
    auditReportVersion: 2,
    vulnerabilities: {
      braces: {
        severity: 'high',
        via: [
          {
            url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
            severity: 'high',
          },
        ],
      },
      micromatch: { severity: 'high', via: ['braces'] },
      'http-cache-semantics': {
        severity: 'high',
        via: [
          {
            url: 'https://github.com/advisories/GHSA-ch52-4w7c-c8xp',
            severity: 'high',
          },
        ],
      },
      'make-fetch-happen': { severity: 'high', via: ['http-cache-semantics'] },
    },
    metadata: { vulnerabilities: { high: 4, critical: 0 } },
  };

  expect(validateDependencyAudits(clean, clean)).toEqual([]);
  expect(validateDependencyAudits(clean, allowed)).toEqual([
    'GHSA-ch52-4w7c-c8xp',
    'GHSA-vfj7-8cjw-p6xm',
  ]);

  const unsafeReports = [
    null,
    '',
    callableReport,
    {},
    { ...clean, auditReportVersion: 1 },
    { ...clean, vulnerabilities: null },
    { ...clean, vulnerabilities: 'unknown' },
    { ...clean, metadata: null },
    { ...clean, metadata: { vulnerabilities: null } },
    { ...clean, metadata: { vulnerabilities: { high: 1, critical: 0 } } },
    { ...clean, metadata: { vulnerabilities: { high: 0, critical: 1 } } },
  ];
  for (const unsafe of unsafeReports)
    expect(() => validateDependencyAudits(unsafe, clean)).toThrow(
      'production_dependency_audit_failed',
    );

  const unsafeCompleteReports = [
    null,
    {},
    { ...allowed, auditReportVersion: 1 },
    { ...allowed, vulnerabilities: null },
    {
      ...allowed,
      vulnerabilities: {
        ...allowed.vulnerabilities,
        unknown: { severity: 'high', via: [{ url: 'https://example.invalid/advisory' }] },
      },
    },
    {
      ...allowed,
      vulnerabilities: {
        ...allowed.vulnerabilities,
        unknown: { severity: 'critical', via: ['missing-dependency'] },
      },
    },
    {
      ...allowed,
      vulnerabilities: {
        ...allowed.vulnerabilities,
        unknown: { severity: 'high', via: [] },
      },
    },
    {
      ...allowed,
      vulnerabilities: {
        ...allowed.vulnerabilities,
        unknown: { severity: 'high', via: [null] },
      },
    },
    {
      ...allowed,
      vulnerabilities: {
        ...allowed.vulnerabilities,
        unknown: { severity: 'high', via: [1] },
      },
    },
    {
      ...allowed,
      vulnerabilities: {
        ...allowed.vulnerabilities,
        unknown: { severity: 'high', via: [callableCause] },
      },
    },
    {
      ...allowed,
      vulnerabilities: {
        ...allowed.vulnerabilities,
        unknown: { severity: 'high', via: [{ url: 1 }] },
      },
    },
    {
      ...allowed,
      vulnerabilities: {
        first: { severity: 'high', via: ['second'] },
        second: { severity: 'high', via: ['first'] },
      },
    },
  ];
  for (const unsafe of unsafeCompleteReports)
    expect(() => validateDependencyAudits(clean, unsafe)).toThrow('dependency_audit_failed');

  expect(
    validateDependencyAudits(clean, {
      ...allowed,
      vulnerabilities: {
        ...allowed.vulnerabilities,
        informational: { severity: 'moderate', via: [{ url: 'https://example.invalid/moderate' }] },
      },
    }),
  ).toEqual(['GHSA-ch52-4w7c-c8xp', 'GHSA-vfj7-8cjw-p6xm']);
  expect(
    validateDependencyAudits(clean, {
      ...allowed,
      vulnerabilities: {
        braces: { ...allowed.vulnerabilities.braces, severity: 'moderate' },
        micromatch: allowed.vulnerabilities.micromatch,
      },
    }),
  ).toEqual(['GHSA-vfj7-8cjw-p6xm']);

  const spawn = vi
    .fn()
    .mockReturnValueOnce({ status: 0, stdout: JSON.stringify(clean) })
    .mockReturnValueOnce({ status: 1, stdout: JSON.stringify(allowed) });
  expect(runDependencyAudit(spawn)).toEqual(['GHSA-ch52-4w7c-c8xp', 'GHSA-vfj7-8cjw-p6xm']);
  expect(spawn).toHaveBeenNthCalledWith(
    1,
    'npm',
    ['audit', '--omit=dev', '--audit-level=high', '--json'],
    { encoding: 'utf8' },
  );
  expect(spawn).toHaveBeenNthCalledWith(2, 'npm', ['audit', '--audit-level=high', '--json'], {
    encoding: 'utf8',
  });
  for (const results of [
    [{ status: 1, stdout: JSON.stringify(clean) }],
    [{ status: null, stdout: JSON.stringify(clean) }],
    [
      { status: 0, stdout: JSON.stringify(clean) },
      { status: 2, stdout: JSON.stringify(allowed) },
    ],
    [
      { status: 0, stdout: JSON.stringify(clean) },
      { status: 0, stdout: 'not-json' },
    ],
  ]) {
    const failedSpawn = vi.fn();
    for (const result of results) failedSpawn.mockReturnValueOnce(result);
    expect(() => runDependencyAudit(failedSpawn)).toThrow('dependency_audit_command_failed');
  }
});
