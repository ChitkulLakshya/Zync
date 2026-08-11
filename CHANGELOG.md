# Changelog

All notable changes to Zync are documented here. Zync follows
[Semantic Versioning](https://semver.org/) and the release workflow tags
`vX.Y.Z`.

## [Unreleased]

### Security
- Hardened the architecture-analysis quota system (Redis-backed per-user
  weekly generation cap, refund-on-failure).
- Removed hardcoded encryption-key fallbacks; production now requires
  `MASTER_ENCRYPTION_KEY` / `ENCRYPTION_KEY`.
- Required auth on file uploads and added a strict allowlist.
- Locked down Firestore/Storage rules to ownership-scoped access.
- Removed self-serve GitHub collaborator auto-grant.
- Removed the public static uploads mount.

### Fixed
- Repaired Kilo JSON parsing when the model emits stray prose quotes.
- Themed React Flow controls and tech icons for dark mode.
- Extended the architecture queue timeout to 120s.

### Added
- Architecture agent chat via the Kilo gateway.
- Frontend unit tests now run under Vitest (previously unwired).
