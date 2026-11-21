import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function run(cmd: string) {
  console.log(`\n>>> Running: ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
  return out;
}

export function syncProgress(commitMessage: string) {
  try {
    console.log('--- Step 1: Rebuilding SQLite fixtures with imported translations ---');
    run('npm run build:fixture');

    console.log('--- Step 2: Exporting static JSON data for GitHub Pages web app ---');
    run('npm run export:static');

    console.log('--- Step 3: Running test suite to ensure zero regressions ---');
    run('npm test');

    console.log('--- Step 4: Staging all files for Git ---');
    run('git add -A');

    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!status.trim()) {
      console.log('No git changes to commit.');
      return;
    }

    console.log(`--- Step 5: Committing: "${commitMessage}" ---`);
    run(`git commit -m "${commitMessage}"`);

    console.log('--- Step 6: Pushing to origin main ---');
    run('git push origin main');

    console.log('>>> Autonomous sync & deployment successfully completed!');
  } catch (err: any) {
    console.error('Error during autonomous sync:', err.message);
    throw err;
  }
}

const msg = process.argv[2] || 'feat(translation): autonomous sync update';
syncProgress(msg);
