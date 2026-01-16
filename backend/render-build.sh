#!/usr/bin/env bash
# exit on error
set -o errexit

# Puppeteer will automatically pick up the cache location from .puppeteerrc.cjs
# which is set to ./.cache/puppeteer (inside the project)
echo "Installing Puppeteer Browsers..."
npx puppeteer browsers install chrome

echo "Installing Dependencies..."
npm install
npm run build
