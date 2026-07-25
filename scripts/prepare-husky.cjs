/**
 * Skip Husky on CI / Render to save install time and avoid deprecated install noise.
 */
const { execSync } = require('child_process');

if (process.env.HUSKY === '0' || process.env.CI === 'true' || process.env.RENDER === 'true') {
  process.exit(0);
}

try {
  execSync('npx husky', { stdio: 'inherit' });
} catch {
  process.exit(0);
}
