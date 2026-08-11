#!/usr/bin/env node
/**
 * build-portable-linux.mjs
 *
 * Builds an unpacked (portable) Electron Linux application via electron-builder's
 * `dir` target and deploys it under `~/.local/opt/MKEditor/mkeditor-<version>-custom/`,
 * managing a `current` symlink for convenient execution.
 *
 * Usage:
 *   node scripts/build-portable-linux.mjs
 *
 * Prerequisites:
 *   - Linux only (script checks `process.platform`)
 *   - `npm run build-all` must succeed first (this script runs it).
 *
 * The script does NOT:
 *   - Use `sudo`
 *   - Write to `/usr`, `/opt`, or any system directory
 *   - Touch shell configuration files
 *   - Generate `.deb` / `.rpm` packages
 */

import { execSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from 'fs';
import { homedir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

function info(msg) {
  console.log(`\x1b[36m[portable]\x1b[0m ${msg}`);
}

function success(msg) {
  console.log(`\x1b[32m[portable]\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`\x1b[33m[portable]\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`\x1b[31m[portable]\x1b[0m ${msg}`);
  process.exit(1);
}

function exec(cmd, cwd = projectRoot) {
  info(`Running: ${cmd}`);
  return execSync(cmd, { cwd, stdio: 'inherit', encoding: 'utf-8' });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(function main() {
  // 1. Confirm platform
  if (process.platform !== 'linux') {
    fail(
      'This script is intended for Linux only. Current platform: ' +
        process.platform,
    );
  }

  // 2. Read version from package.json
  const pkgPath = join(projectRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version;
  if (!version) {
    fail('Could not read version from package.json');
  }
  info(`Package version: ${version}`);

  // 3. Build the full project (editor + app)
  info('Building editor + app...');
  exec('npm run build-all');

  // 4. Build unpacked Linux Electron app via electron-builder
  //    `--linux dir` produces an unpacked directory (no .deb/.rpm).
  //    `--publish never` prevents auto-upload attempts.
  info('Building unpacked Electron app (--linux dir)...');
  exec('npx electron-builder --linux dir --publish never');

  // 5. Locate the electron-builder output.
  //    electron-builder puts `dir` targets under releases/<platform>/<arch>/
  //    e.g. releases/linux/x64/linux-unpacked/.
  const releasesDir = join(projectRoot, 'releases');
  const linuxDir = join(releasesDir, 'linux');
  if (!existsSync(linuxDir)) {
    fail(`Expected releases/linux/ directory not found.`);
  }
  const archDirs = readdirSync(linuxDir).filter((d) => {
    const full = join(linuxDir, d);
    return statSync(full).isDirectory();
  });
  if (archDirs.length === 0) {
    fail(`No architecture directories found under releases/linux/.`);
  }
  const archDir = join(linuxDir, archDirs[0]);
  const unpackedDir = join(archDir, 'linux-unpacked');
  if (!existsSync(unpackedDir)) {
    const contents = readdirSync(archDir).join(', ');
    fail(
      `Could not find linux-unpacked under ${archDir}. Contents: ${contents}`,
    );
  }
  info(`Found unpacked build: ${unpackedDir}`);

  // 6. Prepare target directory under ~/.local/opt/MKEditor/
  const targetBase = join(homedir(), '.local', 'opt', 'MKEditor');
  const versionDirName = `mkeditor-${version}`;
  const versionDir = join(targetBase, versionDirName);

  if (existsSync(versionDir)) {
    info(`Removing previous deployment at ${versionDir}`);
    rmSync(versionDir, { recursive: true, force: true });
  }
  mkdirSync(targetBase, { recursive: true });

  // 7. Copy the unpacked build into the version directory
  info(`Copying unpacked build to ${versionDir}...`);
  // exec sync cp -a is reliable for deep copies
  execSync(`cp -a "${unpackedDir}" "${versionDir}"`, { stdio: 'inherit' });

  // 8. Update the `current` symlink
  const currentLink = join(targetBase, 'current');
  try {
    unlinkSync(currentLink);
  } catch {
    // ignore — link may not exist or be a broken symlink
  }
  symlinkSync(versionDirName, currentLink, 'dir');
  success(`current -> ${versionDirName}`);

  // 9. Find the actual executable
  //    electron-builder's `dir` target produces an executable named
  //    after the productName in package.json (spaces become hyphens
  //    or underscores depending on version).
  let execName = null;
  const candidates = [
    join(versionDir, pkg.productName ?? 'mkeditor'),
    join(versionDir, pkg.productName.toLowerCase()),
    join(versionDir, (pkg.productName ?? 'mkeditor').toLowerCase()),
    join(versionDir, 'mkeditor'),
    join(versionDir, 'MKEditor'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        const s = statSync(c);
        if (s.isFile()) {
          execName = c;
          break;
        }
      } catch {
        /* ignore */
      }
    }
  }
  if (!execName) {
    // Fallback: list what's in the directory
    const items = readdirSync(versionDir).join(', ');
    warn(
      `Could not auto-detect executable in ${versionDir}. Contents: ${items}`,
    );
  } else {
    success(`Executable: ${execName}`);
  }

  // 10. Summary
  console.log('');
  console.log(
    '================================================================================',
  );
  console.log('  Portable MKEditor build complete!');
  console.log('');
  console.log(`  Version dir:  ${versionDir}`);
  console.log(`  Symlink:      ${currentLink} -> ${versionDirName}`);
  if (execName) {
    console.log(`  Executable:   ${execName}`);
    const execBase = execName.split('/').pop();
    console.log('');
    console.log('  Run it with:');
    console.log(`    ${currentLink}/${execBase}`);
    console.log('');
    console.log('  Or create a convenience wrapper script (recommended):');
    console.log(`    cat > ~/.local/bin/mkeditor << 'EOF'`);
    console.log(`    #!/bin/sh`);
    console.log(`    exec ${currentLink}/${execBase} "$@"`);
    console.log(`    EOF`);
    console.log(`    chmod +x ~/.local/bin/mkeditor`);
    console.log('');
    console.log('  (Make sure ~/.local/bin is on your PATH)');
    console.log('');
    console.log('  Custom builds disable upstream updates by default.');
    console.log(
      '  Set MKEDITOR_ENABLE_UPDATER=1 only if you intentionally want',
    );
    console.log('  this fork to follow official MKEditor releases.');
  }
  console.log(
    '================================================================================',
  );
})();
