// Runs a workspace's own ESLint against the given files.
//
// lint-staged executes commands without a shell and always from the repository
// root, so `cd web && eslint` cannot work here. This wrapper changes into the
// workspace first so ESLint picks up that workspace's flat config and its
// `@/*` alias target, then runs the eslint binary resolved from that workspace.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const [workspace, ...files] = process.argv.slice(2);

if (!workspace) {
  console.error('usage: node scripts/lint-workspace.mjs <workspace-dir> [files...]');
  process.exit(1);
}

const cwd = path.resolve(workspace);
// ESLint is run from the workspace, so file paths are resolved against the
// directory this script was started in.
const from = process.cwd();
const paths = files.map((file) => path.resolve(from, file));
const require = createRequire(path.join(cwd, 'package.json'));
// eslint does not export ./bin/eslint.js, so go through its package.json.
const { bin } = require('eslint/package.json');
const eslint = path.join(cwd, 'node_modules', 'eslint', bin.eslint);

const child = spawn(process.execPath, [eslint, '--fix', '--no-warn-ignored', ...paths], {
  cwd,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
