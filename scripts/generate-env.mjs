import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const envPath = resolve(root, '.env');
const outDir = resolve(root, 'src', 'environments');
const outPath = resolve(outDir, 'environment.ts');

if (!existsSync(envPath)) {
  console.error('ERROR: .env file not found at', envPath);
  process.exit(1);
}

const raw = readFileSync(envPath, 'utf-8');
const vars = {};

for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (key) vars[key] = value;
}

const get = (key, fallback) =>
  vars[key] !== undefined ? vars[key] : fallback;

const code = [
  '// This file is auto-generated from .env by scripts/generate-env.mjs',
  '// Do not edit manually.',
  'export const environment = {',
  '  auth: {',
  `    authority: ${JSON.stringify(get('AUTH_AUTHORITY', ''))},`,
  `    redirectUrl: ${JSON.stringify(get('AUTH_REDIRECT_URL', 'http://localhost:4200'))},`,
  `    clientId: ${JSON.stringify(get('AUTH_CLIENT_ID', ''))},`,
  `    scope: ${JSON.stringify(get('AUTH_SCOPE', 'openid email'))},`,
  '  },',
  '  api: {',
  `    baseUrl: ${JSON.stringify(get('API_BASE_URL', 'http://localhost:8080/api'))},`,
  '  },',
  '};',
  '',
].join('\n');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

writeFileSync(outPath, code, 'utf-8');
console.log(`Generated ${outPath}`);
