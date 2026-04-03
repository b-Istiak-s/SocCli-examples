import { spawnSync } from 'node:child_process';

const args = ['compose', 'up', '--build', 'signalr', 'reverb', 'mqtt', 'wamp'];
const run = spawnSync('docker', args, { stdio: 'inherit' });

if (run.status === 0) process.exit(0);

console.error('\n[dev:infra] Infra stack failed to start.');
console.error('[dev:infra] If you use Podman, your output usually means podman.socket is not active.');
console.error('[dev:infra] Try: systemctl --user start podman.socket');
console.error('[dev:infra] Then verify: systemctl --user status podman.socket');
console.error('[dev:infra] Re-run: npm run dev:infra:strict');
console.error('[dev:infra] Continuing without infra so JS services can still run.\n');

process.exit(0);
