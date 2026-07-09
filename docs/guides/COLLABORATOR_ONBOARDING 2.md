# 🤝 Open-Source Collaborator Onboarding Guide

## Overview

Zync provides a frictionless, community-driven onboarding flow for open-source developers wishing to contribute to the repository. Rather than relying on generic username/password registration, the system dynamically queries GitHub to mint contributor passes.

---

## ⚡ Technical Architecture

### 1. Frontend Ingestion Card (`ContributorTicket.tsx`)
Located on the main landing page, this component powers the contributor signup flow:
- **Live GitHub Profile Lookup**: Queries public GitHub endpoints (`https://api.github.com/users/<username>`) directly to fetch developer metadata (Avatar, Bio, Name).
- **Holographic UI**: Features VisionOS-inspired 3D spring physics, dynamic mouse tilt transforms (`useTransform`), and ambient glare overlays.
- **Submission Flow**: Once verified, submits the user's GitHub username, profile URL, and email address to the backend.

### 2. Backend Registration Route (`collaboratorRoutes.js`)
Mounted at `/api/collaborator`, this lightweight route handles onboarding requests:
- **Validation**: Verifies payload integrity (`githubUsername` and `email`).
- **Admin Dispatch**: Utilizes `nodemailer` to dispatch a formatted HTML notification directly to core repository maintainers (`ADMIN_EMAIL`), streamlining contributor review.

---

## 🚫 Purged Legacy Workflows

Earlier speculative documentation referenced unverified OTP (One-Time Password) email flows and direct GitHub Octokit repository invitation triggers. These hallucinated workflows have been removed from the documentation to maintain strict alignment with production codebase execution.
