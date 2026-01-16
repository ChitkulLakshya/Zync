#!/usr/bin/env bash
# exit on error
set -o errexit

# Skip Chrome download during npm install (we install it manually below)
export PUPPETEER_SKIP_DOWNLOAD=true

echo "Installing Dependencies..."
npm install
npm run build

# Now install Chrome using the config file (.puppeteerrc.cjs)
echo "Installing Puppeteer Browsers..."
npx puppeteer browsers install chrome
