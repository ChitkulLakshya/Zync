# 🎨 Design Inspiration & Web Scraping Engine Guide

## Overview

Zync includes a dedicated **Design View** (`DesignView.tsx`) that aggregates curated UI/UX inspirations from top design showcases across the web. Rather than relying on restrictive public API rate limits or requiring user OAuth connections, Zync powers this feature via a headless browser scraping engine.

---

## ⚡ Technical Architecture

### 1. Scraping Service (`backend/services/scraperService.js`)
The backend utilizes **Puppeteer** combined with `puppeteer-extra-plugin-stealth` to bypass automated bot detection and retrieve visual design assets:
- **Supported Targets**: Actively scrapes showcases including **Dribbble**, **Godly**, **SiteInspire**, **LapaNinja**, and **Awwwards**.
- **Execution Flow**:
  1. Launches headless Chromium instances.
  2. Navigates to search queries or curated category feeds.
  3. Extracts image source URLs, project titles, and author attributions.
  4. Returns standardized JSON payloads to the frontend canvas.

### 2. Maintenance & Pre-Caching (`scripts/maintenance/generate-inspiration.js`)
To ensure zero latency for end users, scraping can be executed asynchronously via background maintenance tasks to populate static fallback datasets (`backend/data/inspiration.json`).

---

## 🚫 Purged Speculative Workflows

Legacy guides previously claimed Dribbble integration required user OAuth 2.0 authorization code flows (`DRIBBBLE_CLIENT_ID`, redirect callbacks). Those claims were obsolete and inaccurate; all inspiration harvesting is strictly handled server-side via Puppeteer.
