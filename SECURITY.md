# Security Policy

## Supported Versions

Zync follows continuous deployment. Security fixes land on the latest `main`
production deployment only.

| Branch / Release | Supported |
| :--- | :--- |
| `main` (production) | ✅ |
| Legacy branches | ❌ |

## Reporting a Vulnerability

**Do NOT report vulnerabilities via public GitHub issues, PRs, or discussions.**

Email a detailed report to **consolemaster.app@gmail.com** with subject prefix
`[VULNERABILITY] <brief description>`, including:

- Repro steps (or a minimal PoC)
- Affected endpoints/modules
- Impact estimate

We aim to acknowledge within 48h and triage within a week. Details of the full
policy: [docs/security/SECURITY.md](docs/security/SECURITY.md).

## Scope

- In scope: Zync web app (frontend + backend API), auth flows, the
  architecture-analysis and chat features.
- Out of scope: third-party services (Firebase, GitHub, Render, provider APIs)
  and their own vulnerabilities.

## Safe Harbor

We consider good-faith research conducted under this policy safe harbor and
will not pursue legal action for responsibly disclosed findings.
