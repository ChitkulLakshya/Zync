#!/usr/bin/env bash
# exit on error
set -o errexit

export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

echo "Installing Chrome dependencies..."
# Update package list and install libraries
# Note: This assumes running as root (Docker) or environment allows apt-get
apt-get update && apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  procps \
  libxss1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxi6 \
  libxtst6 \
  libcups2 \
  libxrandr2 \
  libgconf-2-4 \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  fonts-liberation \
  libappindicator3-1 \
  libgbm1

echo "Installing dependencies and building..."

# Check if we are in the root and need to go to backend
if [ -d "backend" ]; then
  cd backend
fi

npm install
npm run build
