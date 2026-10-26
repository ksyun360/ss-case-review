import { spawnSync } from 'node:child_process';

const APPROVED_UNPATCHED_DEVELOPMENT_ADVISORIES = new Map([
  ['https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', 'GHSA-vfj7-8cjw-p6xm'],
  ['https://github.com/advisories/GHSA-ch52-4w7c-c8xp', 'GHSA-ch52-4w7c-c8xp'],
  ['https://github.com/advisories/GHSA-r7fv-28h4-cvq7', 'GHSA-r7fv-28h4-cvq7'],
  ['https://github.com/advisories/GHSA-vfgh-jcmw-g37q', 'GHSA-vfgh-jcmw-g37q'],
  ['https://github.com/advisories/GHSA-gfr2-rv44-r23c', 'GHSA-gfr2-rv44-r23c'],
  ['https://github.com/advisories/GHSA-698v-4r3x-3vcv', 'GHSA-698v-4r3x-3vcv'],
  ['https://github.com/advisories/GHSA-r825-w8mm-5pxw', 'GHSA-r825-w8mm-5pxw'],
  ['https://github.com/advisories/GHSA-587h-7wmj-h5pm', 'GHSA-587h-7wmj-h5pm'],
  ['https://github.com/advisories/GHSA-9jrq-w75r-8gcw', 'GHSA-9jrq-w75r-8gcw'],
  ['https://github.com/advisories/GHSA-rq7h-c2jc-7f22', 'GHSA-rq7h-c2jc-7f22'],
  ['https://github.com/advisories/GHSA-vfpm-58rq-9qcg', 'GHSA-vfpm-58rq-9qcg'],
  ['https://github.com/advisories/GHSA-xjj6-f33q-929c', 'GHSA-xjj6-f33q-929c'],
  ['https://github.com/advisories/GHSA-mrhx-c7xc-m3w5', 'GHSA-mrhx-c7xc-m3w5'],
  ['https://github.com/advisories/GHSA-4qv8-2p9j-2685', 'GHSA-4qv8-2p9j-2685'],
  ['https://github.com/advisories/GHSA-f72v-6w45-q472', 'GHSA-f72v-6w45-q472'],
]);

type AuditVulnerability = Readonly<{
  severity?: unknown;
  via?: unknown;
}>;

type AuditReport = Readonly<{
  auditReportVersion: 2;
  vulnerabilities: Record<string, AuditVulnerability>;
  metadata?: Readonly<{
    vulnerabilities?: Readonly<{ high?: unknown; critical?: unknown }>;
  }>;
}>;

type AuditCommand = (
  command: string,
  arguments_: string[],
  options: Readonly<{ encoding: 'utf8' }>,
) => Readonly<{ status: number | null; stdout: string }>;

function asAuditReport(value: unknown, failureCode: string): AuditReport {
  if (typeof value !== 'object' || value === null) throw new Error(failureCode);
  const candidate = value as Partial<AuditReport>;
  if (
    candidate.auditReportVersion !== 2 ||
    typeof candidate.vulnerabilities !== 'object' ||
    candidate.vulnerabilities === null
  )
    throw new Error(failureCode);
  return candidate as AuditReport;
}

function collectApprovedAdvisories(
  name: string,
  vulnerabilities: Record<string, AuditVulnerability>,
  visiting: ReadonlySet<string>,
): Set<string> {
  if (visiting.has(name)) throw new Error('dependency_audit_failed');
  const vulnerability = vulnerabilities[name];
  if (!vulnerability || !Array.isArray(vulnerability.via) || vulnerability.via.length === 0)
    throw new Error('dependency_audit_failed');
  const found = new Set<string>();
  const nextVisiting = new Set(visiting).add(name);
  for (const cause of vulnerability.via) {
    if (typeof cause === 'string') {
      for (const advisory of collectApprovedAdvisories(cause, vulnerabilities, nextVisiting))
        found.add(advisory);
      continue;
    }
    if (typeof cause !== 'object' || cause === null) throw new Error('dependency_audit_failed');
    const url = (cause as { url?: unknown }).url;
    const advisory = APPROVED_UNPATCHED_DEVELOPMENT_ADVISORIES.get(url as string);
    if (!advisory) throw new Error('dependency_audit_failed');
    found.add(advisory);
  }
  return found;
}

export function validateDependencyAudits(production: unknown, complete: unknown): string[] {
  const productionReport = asAuditReport(production, 'production_dependency_audit_failed');
  const productionCounts = productionReport.metadata?.vulnerabilities;
  if (productionCounts?.high !== 0 || productionCounts.critical !== 0)
    throw new Error('production_dependency_audit_failed');

  const completeReport = asAuditReport(complete, 'dependency_audit_failed');
  const advisories = new Set<string>();
  for (const [name, vulnerability] of Object.entries(completeReport.vulnerabilities)) {
    if (vulnerability.severity !== 'high' && vulnerability.severity !== 'critical') continue;
    for (const advisory of collectApprovedAdvisories(
      name,
      completeReport.vulnerabilities,
      new Set(),
    ))
      advisories.add(advisory);
  }
  return [...advisories].sort();
}

function parseCommandReport(result: ReturnType<AuditCommand>, acceptedStatuses: number[]): unknown {
  if (!acceptedStatuses.includes(result.status as number))
    throw new Error('dependency_audit_command_failed');
  try {
    return JSON.parse(result.stdout) as unknown;
  } catch {
    throw new Error('dependency_audit_command_failed');
  }
}

export function runDependencyAudit(command: AuditCommand = spawnSync): string[] {
  const production = parseCommandReport(
    command('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], {
      encoding: 'utf8',
    }),
    [0],
  );
  const complete = parseCommandReport(
    command('npm', ['audit', '--audit-level=high', '--json'], { encoding: 'utf8' }),
    [0, 1],
  );
  return validateDependencyAudits(production, complete);
}
