import { cpSync, existsSync, rmSync } from 'node:fs';
import { basename, resolve } from 'node:path';

// Cloudflare may restore an older build-output cache before running Vite.
// Remove the legacy Pages redirect because Workers static assets already use
// `not_found_handling: single-page-application` from wrangler.jsonc.
const legacyRedirect = resolve('dist', '_redirects');
const sourceDirectory = resolve('dist');
const deploymentDirectory = resolve('cloudflare-dist');

if (existsSync(legacyRedirect)) {
  rmSync(legacyRedirect);
  console.log('Removed legacy dist/_redirects from the deployment output.');
}

// Publish from a freshly recreated directory so Cloudflare's restored build
// cache can never reintroduce a legacy Pages redirect into a Workers upload.
rmSync(deploymentDirectory, { recursive: true, force: true });
cpSync(sourceDirectory, deploymentDirectory, {
  recursive: true,
  filter: source => basename(source) !== '_redirects',
});
console.log('Prepared clean Cloudflare assets in cloudflare-dist/.');
