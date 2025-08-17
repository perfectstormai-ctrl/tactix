#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ci = process.argv.includes('--ci');
const issues = [];

function addIssue(issue) {
  issues.push(issue);
}

const markerRe = /(TODO|FIXME|HACK|XXX|STUB|TBD|PENDING)/;
const routeRe = /router\.(get|post|patch|delete)\(([^)]*)\)/g;
const wsConnRe = /\.on\(['"]connection['"]/;

const gitFiles = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const textExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.json',
  '.md',
  '.env',
  '.sh',
  '.yml',
  '.yaml',
]);

const fileContents = new Map();

for (const file of gitFiles) {
  const ext = path.extname(file);
  if (!textExtensions.has(ext)) continue;
  const content = await readFile(file, 'utf8');
  fileContents.set(file, content);
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    if (markerRe.test(line)) {
      addIssue({
        severity: 'high',
        kind: 'marker',
        file,
        line: idx + 1,
        message: line.trim(),
      });
    }
  });

  let match;
  while ((match = routeRe.exec(content))) {
    const routeDef = match[0];
    if (!/requireAuth/.test(routeDef)) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      addIssue({
        severity: 'high',
        kind: 'route-auth',
        file,
        line,
        message: `Route missing requireAuth: ${routeDef.trim()}`,
      });
    }
  }

  if (wsConnRe.test(content)) {
    if (!/token|Sec-WebSocket-Protocol/.test(content)) {
      const line = lines.findIndex((l) => wsConnRe.test(l)) + 1;
      addIssue({
        severity: 'high',
        kind: 'ws-auth',
        file,
        line,
        message: 'WebSocket connection handler lacks token verification',
      });
    }
  }
}

// Service checks
const serviceDirs = gitFiles
  .filter((f) => f.startsWith('services/'))
  .map((f) => f.split('/')[1])
  .filter((v, i, arr) => arr.indexOf(v) === i);

for (const svc of serviceDirs) {
  const svcFiles = gitFiles.filter((f) => f.startsWith(`services/${svc}/`));
  const svcContent = svcFiles
    .map((f) => fileContents.get(f) || '')
    .join('\n');

  if (!/\/health/.test(svcContent)) {
    addIssue({
      severity: 'high',
      kind: 'health',
      file: `services/${svc}`,
      message: 'Missing /health endpoint',
    });
  }

  if (!/openapi\.json/.test(svcContent)) {
    addIssue({
      severity: 'high',
      kind: 'openapi',
      file: `services/${svc}`,
      message: 'Missing /openapi.json exporter',
    });
  }

  if (!/port/i.test(svcContent) || !/mode/i.test(svcContent)) {
    addIssue({
      severity: 'info',
      kind: 'startup-log',
      file: `services/${svc}`,
      message: 'Service may not log startup summary (port/mode)',
    });
  }
}

// .env.example variables
const envFiles = gitFiles.filter((f) => f.endsWith('.env.example'));
const allText = Array.from(fileContents.values()).join('\n');
for (const envFile of envFiles) {
  const content = fileContents.get(envFile) || '';
  const vars = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => l.split('=')[0]);
  for (const v of vars) {
    const re = new RegExp(`\b${v}\b`);
    if (!re.test(allText)) {
      addIssue({
        severity: 'info',
        kind: 'env-unused',
        file: envFile,
        message: `Variable not referenced: ${v}`,
      });
    }
  }
}

const summary = {
  high: issues.filter((i) => i.severity === 'high').length,
  info: issues.filter((i) => i.severity === 'info').length,
};

await writeFile('zt-audit.json', JSON.stringify({ issues, summary }, null, 2));

if (issues.length) {
  console.log('ZT Audit Report');
  console.table(
    issues.map((i) => ({
      severity: i.severity,
      kind: i.kind,
      location: i.line ? `${i.file}:${i.line}` : i.file,
      message: i.message,
    }))
  );
} else {
  console.log('ZT Audit: no issues found');
}

if (ci && summary.high > 0) {
  process.exitCode = 1;
}
