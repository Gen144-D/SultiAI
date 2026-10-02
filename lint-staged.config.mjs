// Each workspace resolves `@/*` to a different directory and has its own ESLint
// config, so web/ and admin/ files must be linted from inside their own
// workspace (see scripts/lint-workspace.mjs). Everything else is linted with
// the root Expo config, which reports bogus `import/no-unresolved` errors for
// the web and admin file sets.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CODE = '**/*.{js,jsx,mjs,cjs,ts,tsx}';
const rootDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const quote = (file) => `"${file}"`;
const inWorkspace = (file) => {
  const relative = path.relative(rootDir, path.resolve(file));
  return !relative.startsWith('..') && /^(web|admin)[\\/]/.test(relative);
};

// server/ has no ESLint config of its own and the root Expo config reports
// ~170 false positives on its Express/jest code (missing jest globals,
// expo/no-dynamic-env-var), so server files are only prettier'd here.
const inServer = (file) => {
  const relative = path.relative(rootDir, path.resolve(file));
  return !relative.startsWith('..') && /^server[\\/]/.test(relative);
};

const lintIn = (dir) => (files) =>
  `node scripts/lint-workspace.mjs ${dir} ${files.map(quote).join(' ')}`;

const lintRoot = (files) => {
  const rootFiles = files.filter((file) => !inWorkspace(file) && !inServer(file));
  return rootFiles.length ? [`eslint --fix ${rootFiles.map(quote).join(' ')}`] : [];
};

export default {
  'web/**/*.{js,jsx,mjs,cjs,ts,tsx}': [lintIn('web'), 'prettier --write'],
  'admin/**/*.{js,jsx,mjs,cjs,ts,tsx}': [lintIn('admin'), 'prettier --write'],
  [CODE]: [lintRoot, 'prettier --write'],
  '**/*.{json,md,yml,yaml}': ['prettier --write'],
};
