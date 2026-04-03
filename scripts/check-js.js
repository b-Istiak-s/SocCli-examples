import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const servicesDir = 'services';
const serviceNames = readdirSync(servicesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

let failed = false;
for (const service of serviceNames) {
  const target = join(servicesDir, service, 'server.js');
  if (!existsSync(target)) continue;

  const run = spawnSync(process.execPath, ['--check', target], { stdio: 'inherit' });
  if (run.status !== 0) failed = true;
}

if (failed) process.exit(1);
