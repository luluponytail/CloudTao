import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

// Cloudflare may restore an older build-output cache before running Vite.
// Remove the legacy Pages redirect because Workers static assets already use
// `not_found_handling: single-page-application` from wrangler.jsonc.
const legacyRedirect = resolve('dist', '_redirects');

if (existsSync(legacyRedirect)) {
  rmSync(legacyRedirect);
  console.log('Removed legacy dist/_redirects from the deployment output.');
}
