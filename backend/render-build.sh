#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing Puppeteer Browsers..."
npx puppeteer browsers install chrome

echo "Installing Dependencies..."
npm install
npm run build
