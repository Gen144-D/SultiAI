#!/usr/bin/env node
/**
 * One-command deploy for the marketing site in web/ to Netlify.
 *
 *   npm run deploy:web            rebuild on Netlify and deploy to production
 *   npm run deploy:web:preview    same, but to a draft URL
 *   npm run deploy:web:local      build on this machine and upload the result
 *
 * By default Netlify builds it, which is both the normal production path and
 * the only one that works from this checkout: the repo sits inside OneDrive,
 * and @netlify/plugin-nextjs finishes a build by renaming the ~2000-file .next
 * directory. OneDrive's sync client holds handles inside it and the rename
 * fails with `EPERM: operation not permitted, rename '.next' ->
 * '.netlify/.next'`, which surfaces only as the unhelpful "Failed publishing
 * static content". Netlify's own Linux builders have no such problem.
 * `--local` keeps the upload-a-local-build path for checkouts outside OneDrive.
 *
 * The trigger mode deploys the last *pushed* commit, so the script prints any
 * unpushed commits and uncommitted files first rather than letting you believe
 * a local edit went live.
 *
 * Everything below exists to make those commands the *whole* procedure. The
 * CLI is finicky in ways that produce silently-wrong sites rather than errors,
 * so this script pins the things that actually bite:
 *
 * 1. Run from the repo root. netlify.toml lives there and pins base = "web",
 *    and since netlify-cli v16 every command executes from the workspace root
 *    anyway (the dir holding the highest-level package.json). Running from
 *    web/ or server/ risks resolving the wrong config.
 *
 * 2. Never split the build from the deploy. `netlify deploy` builds by default,
 *    and that build is what turns .next into Netlify functions via Netlify's
 *    Next.js adapter. Building by hand and shipping the output with --no-build
 *    uploads a .next directory with no functions behind it, so every dynamic
 *    route 404s in production. Do not "optimise" this into two steps.
 *
 * 3. Pass an explicit --context. deploy defaults to the `dev` context, so
 *    env vars scoped only to Production in the Netlify UI would be invisible
 *    and the build would silently fall back to its defaults -- e.g. canonical
 *    URLs and sitemap would point at the fallback origin. Prod gets
 *    `production`, previews get `deploy-preview`, matching Netlify CI.
 *
 * 4. Set NETLIFY=true for local builds. next.config.ts only enables
 *    `output: "standalone"` when neither VERCEL nor NETLIFY is set, because the
 *    standalone trace is what breaks the build on these platforms. Netlify sets
 *    it on its own builders; a local shell does not.
 *
 * netlify-cli is intentionally not a dependency of this repo -- see the comment
 * on netlifyBin(). Install it once with `npm i -g netlify-cli`.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// netlify-cli/package.json "engines". Older CLIs fail in confusing ways during
// the build rather than at startup, so check it before anything else.
const MIN_NODE = [22, 13, 0];

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const wantsHelp = flags.has('--help') || flags.has('-h');
const isPreview = flags.has('--preview');
const openBrowser = flags.has('--open');
// Netlify builds it by default; --local opts into building on this machine.
const buildLocally = flags.has('--local');

function flagValue(name) {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
}

function fail(message, hint) {
  console.error(`\n  error: ${message}`);
  if (hint) console.error(`\n  ${hint}\n`);
  else console.error('');
  process.exit(1);
}

function warn(message) {
  console.warn(`  warning: ${message}`);
}

function step(message) {
  console.log(`\n> ${message}`);
}

/**
 * Locates netlify-cli's JS entrypoint so it can be run with `node` directly.
 *
 * Running the entrypoint rather than the `netlify`/`netlify.cmd` shim matters on
 * Windows: Node refuses to spawn a .cmd without a shell, and going through a
 * shell would mean quoting the deploy message into cmd.exe. Spawning
 * process.execPath avoids both.
 *
 * netlify-cli is deliberately NOT a dependency of this repo. Adding it to the
 * root package.json reshuffles ~1500 entries in package-lock.json (npm re-hoists
 * the whole tree to satisfy it), which is a lot of unreviewable churn in an
 * Expo workspace for a deploy convenience. Netlify's docs treat a global
 * install as the normal local setup anyway. So: honour NETLIFY_BIN if set,
 * then a local install if one happens to exist, then the global one.
 */
function netlifyBin() {
  const override = process.env.NETLIFY_BIN;
  if (override && existsSync(override)) return override;

  const local = packageEntry(path.join(ROOT, 'node_modules'));
  if (local) return local;

  // `npm root -g` is the only reliable way to find the global prefix across
  // nvm/n/fnm/volta and Windows' %APPDATA%\npm layout. Run npm's own entrypoint
  // with this same Node rather than the npm shim, so no shell is involved.
  const npmCli = path.join(
    path.dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js'
  );
  const globalRoot = existsSync(npmCli)
    ? spawnSync(process.execPath, [npmCli, 'root', '-g'], { encoding: 'utf8' })
    : spawnSync('npm', ['root', '-g'], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
      });
  if (globalRoot.status === 0 && globalRoot.stdout) {
    const global = packageEntry(globalRoot.stdout.trim());
    if (global) return global;
  }

  return null;
}

/** Resolves <dir>/netlify-cli/bin/run.js from the package's own `bin` field. */
function packageEntry(dir) {
  const pkgFile = path.join(dir, 'netlify-cli', 'package.json');
  if (!existsSync(pkgFile)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
    // `bin` is `{ netlify, ntl }` today but has been a bare string before.
    const rel = typeof pkg.bin === 'string' ? pkg.bin : (pkg.bin?.netlify ?? pkg.bin?.ntl);
    if (!rel) return null;
    const abs = path.resolve(dir, 'netlify-cli', rel);
    return existsSync(abs) ? abs : null;
  } catch {
    return null;
  }
}

/**
 * Runs the CLI synchronously and returns the spawnSync result. Only used for
 * the `status --json` preflight probe, hence capture by default; the deploy
 * itself is spawned separately so its build log streams live.
 */
function runNetlify(bin, args, { capture = true } = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: ROOT,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: false,
  });
}

function checkNodeVersion() {
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  const [minMajor, minMinor, minPatch] = MIN_NODE;
  const tooOld =
    major < minMajor ||
    (major === minMajor && (minor < minMinor || (minor === minMinor && patch < minPatch)));
  if (tooOld) {
    fail(
      `netlify-cli needs Node >= ${MIN_NODE.join('.')}; this is ${process.versions.node}.`,
      'Install a newer Node (nvm install 22 && nvm use 22), then retry.'
    );
  }
}

/**
 * netlify.toml pins NODE_VERSION for the remote build. Netlify's docs call out
 * a local/remote Node mismatch as a common source of "works on my machine"
 * build failures, so warn rather than block -- it is not always wrong.
 */
function checkRemoteNodeVersion() {
  const toml = path.join(ROOT, 'netlify.toml');
  if (!existsSync(toml)) return;
  const match = readFileSync(toml, 'utf8').match(/^\s*NODE_VERSION\s*=\s*"([^"]+)"/m);
  if (!match) return;

  const remote = match[1].trim();
  const localMajor = process.versions.node.split('.')[0];
  if (remote.split('.')[0] !== localMajor) {
    warn(
      `local Node is v${process.versions.node} but netlify.toml builds on Node ${remote}. ` +
        'If the build fails in a way it does not locally, match them.'
    );
  }
}

/**
 * Fail early and specifically on the two things that are tedious to diagnose
 * from netlify-cli output: not logged in, and not linked to a site.
 */
function checkAuthAndLink(bin) {
  const result = runNetlify(bin, ['status', '--json']);
  let status = null;
  try {
    status = JSON.parse(result.stdout || '');
  } catch {
    // Unparseable is treated as "cannot prove we are ready", so let the real
    // deploy run and surface the CLI's own message rather than guessing here.
    return;
  }

  if (!status.loggedIn) {
    fail(
      'not logged in to Netlify.',
      'Run `npx netlify login` once (it opens a browser), or export NETLIFY_AUTH_TOKEN.'
    );
  }
  if (!status.linked) {
    fail(
      'this folder is not linked to a Netlify site (no .netlify/state.json).',
      'Run `npx netlify link` once and pick the site that serves the marketing pages.'
    );
  }
}

/**
 * The real trap: `next build` loads .env.local in every environment except
 * test, and web/.env.local is gitignored -- so Netlify's own builders never
 * see it, but a local build does. Any value in there therefore overrides the
 * Netlify UI for this deploy only, which is how a local NEXT_PUBLIC_SITE_URL
 * ends up baked into production canonical URLs and sitemap.xml.
 */
function checkLocalEnvLeak() {
  const localEnv = path.join(ROOT, 'web', '.env.local');
  if (!existsSync(localEnv)) return;

  warn(
    'web/.env.local exists and `next build` will load it, so its values ' +
      'override the Netlify UI env vars for this deploy only.'
  );
  warn(
    'If it holds dev-only values (e.g. NEXT_PUBLIC_API_URL=http://localhost:3002), ' +
      'rename it to web/.env.dev-backup for the duration of the deploy.'
  );
}

/**
 * Building here means Netlify's plugin will rename web/.next at the end of the
 * build. OneDrive's sync client keeps handles on files inside it and that
 * rename fails with EPERM, which the plugin reports only as "Failed publishing
 * static content" several minutes into the build. Catch it up front.
 */
function checkLocalBuildIsPossible() {
  const normalized = ROOT.replace(/\\/g, '/').toLowerCase();
  if (!normalized.includes('/onedrive/') && !normalized.includes('/onedrive')) {
    if (process.platform === 'win32') {
      warn(
        'local builds on Windows rename web/.next at the end; if this fails with ' +
          '"Failed publishing static content", move the checkout out of OneDrive.'
      );
    }
    return;
  }

  fail(
    'this checkout is inside OneDrive, so a local build cannot finish.',
    "Netlify's Next.js plugin ends the build by renaming web/.next, and OneDrive " +
      'blocks that with EPERM. Drop --local (the default) to have Netlify build it, ' +
      'or move the checkout out of OneDrive.'
  );
}

/**
 * `--trigger` asks Netlify to rebuild from the pushed commit, which needs the
 * project to still be connected to Git. A disconnected project 404s with a
 * vague "Project not found", so translate it.
 */
function explainCiDisconnect(stderr) {
  if (!stderr.includes('Project not found')) return;
  console.error(
    '\n  Netlify could not start a build for this project, which means continuous\n' +
      '  deployment is not connected to it any more.\n\n' +
      '  Fix it once at:\n' +
      '    https://app.netlify.com/projects/profound-klepon-0f7fcd/settings/git\n\n' +
      '  Reconnect the repository there, then run this again.\n'
  );
}

function gitMessage() {
  const opts = { cwd: ROOT, encoding: 'utf8' };
  const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], opts);
  if (sha.status !== 0 || !sha.stdout) return 'manual deploy';

  const subject = spawnSync('git', ['log', '-1', '--pretty=%s'], opts);
  const text = subject.status === 0 ? subject.stdout.trim() : '';
  const combined = `web: ${sha.stdout.trim()}${text ? ` ${text}` : ''}`;
  // Netlify's deploy-message column is narrow; keep it to one readable line.
  return combined.length > 100 ? `${combined.slice(0, 97)}...` : combined;
}

/**
 * A triggered build uses the pushed commit, so anything unpushed or uncommitted
 * will NOT be live. Saying so up front beats discovering it on the live site.
 */
function reportUnpushedWork() {
  const opts = { cwd: ROOT, encoding: 'utf8' };

  const unpushed = spawnSync('git', ['log', '--oneline', 'origin/main..HEAD'], opts);
  if (unpushed.status === 0 && unpushed.stdout.trim()) {
    const lines = unpushed.stdout.trim().split(/\r?\n/);
    warn(`${lines.length} commit(s) are not on origin/main and will NOT be deployed:`);
    for (const line of lines.slice(0, 5)) console.warn(`    ${line}`);
    if (lines.length > 5) console.warn(`    ...and ${lines.length - 5} more`);
    console.warn('    Push them first:  git push origin main');
  }

  const dirty = spawnSync('git', ['status', '--porcelain'], opts);
  if (dirty.status === 0 && dirty.stdout.trim()) {
    const files = dirty.stdout.trim().split(/\r?\n/);
    warn(`${files.length} uncommitted change(s) will NOT be deployed, including:`);
    for (const line of files.slice(0, 5)) console.warn(`    ${line.slice(0, 3)} ${line.slice(3)}`);
    if (files.length > 5) console.warn(`    ...and ${files.length - 5} more`);
  }
}

function printHelp() {
  console.log(`
  Deploy the marketing site (web/) to Netlify.

    npm run deploy:web            Netlify rebuilds it, deploys to production
    npm run deploy:web:preview    same, but to a draft URL
    npm run deploy:web:local      build here and upload (see caveat below)

  Netlify builds it by default. That deploys the last pushed commit, and it is
  also the only mode that works from a checkout inside OneDrive: Netlify's
  Next.js plugin ends the build by renaming the .next directory, which OneDrive
  blocks with EPERM. Use --local only outside OneDrive.

  Flags (pass through to the script):
    --preview        deploy to a draft URL instead of production
    --local          build on this machine instead of on Netlify
    --open           open the deployed site in a browser when it finishes
    --message <txt>  override the deploy message (default: git sha + subject)

  One-time setup, if you have not already:
    npm i -g netlify-cli
    npx netlify login
    npx netlify link
`);
}

async function main() {
  if (wantsHelp) {
    printHelp();
    return;
  }

  checkNodeVersion();

  if (!existsSync(path.join(ROOT, 'netlify.toml'))) {
    fail('netlify.toml is missing from the repo root.', 'Run this from a checkout of the repo.');
  }

  const bin = netlifyBin();
  if (!bin) {
    fail(
      'netlify-cli was not found (checked a local install and the global npm root).',
      'Install it once with `npm i -g netlify-cli`, then retry. Set NETLIFY_BIN to ' +
        'point at the entrypoint if you keep it somewhere unusual.'
    );
  }

  checkRemoteNodeVersion();
  checkAuthAndLink(bin);
  checkLocalEnvLeak();
  if (buildLocally) checkLocalBuildIsPossible();

  const args = ['deploy'];
  args.push('--context', isPreview ? 'deploy-preview' : 'production');
  if (buildLocally) {
    // Build here, then upload the result.
    if (!isPreview) args.push('--prod');
  } else {
    // Let Netlify's builders do it, from the pushed commit.
    args.push('--trigger');
    if (!isPreview) args.push('--prod');
    reportUnpushedWork();
  }
  args.push('--message', flagValue('--message') ?? gitMessage());
  if (openBrowser) args.push('--open');

  const where = buildLocally ? 'this machine' : "Netlify's builders";
  step(
    isPreview
      ? `Building web/ on ${where} and deploying to a draft URL...`
      : `Building web/ on ${where} and deploying to production...`
  );

  const child = spawn(process.execPath, [bin, ...args], {
    cwd: ROOT,
    // stderr is piped so it can be scanned for the CI-disconnect message; it is
    // still forwarded live, so build logs are unaffected.
    stdio: ['inherit', 'inherit', 'pipe'],
    // See note 4 in the header: keeps next.config.ts off the standalone branch.
    // Only the --local path reads this; a triggered build uses Netlify's own env.
    env: { ...process.env, NETLIFY: 'true' },
    shell: false,
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
    process.stderr.write(chunk);
  });

  // Forward interrupts (Ctrl+C) to the CLI so it can clean up the draft deploy.
  const forward = (signal) => () => child.kill(signal);
  process.on('SIGINT', forward('SIGINT'));
  process.on('SIGTERM', forward('SIGTERM'));

  const code = await new Promise((resolve) => {
    child.on('error', (err) =>
      fail(
        `could not start netlify-cli: ${err.message}`,
        'Reinstall it with `npm i -g netlify-cli`.'
      )
    );
    child.on('close', resolve);
  });

  if (code !== 0) {
    explainCiDisconnect(stderr);
    process.exit(code ?? 1);
  }
  console.log(`\n  Done.${isPreview ? ' Draft URL is printed above.' : ' Production is live.'}\n`);
}

await main();
