# Contribution Workflow

This is the day-to-day workflow for contributing to Zync. The big picture and
policies live in [CONTRIBUTING.md](../CONTRIBUTING.md); this page is the
mechanics.

## 1. Find or file an issue

- Prefer an existing issue labeled `good first issue` or `help wanted`.
- For new work, file a bug report or feature request first and get a thumbs-up
  before writing code. Small docs/typo fixes don't need an issue.

## 2. Branch

Work on a branch off `main`. Keep the branch focused on one concern.

```bash
git checkout main
git pull
git checkout -b fix/describe-the-fix
```

Suggested prefixes: `fix/`, `feat/`, `docs/`, `chore/`.

## 3. Implement + verify locally

Set up the app first (see [README](../README.md#-quick-start-local-development)):

```bash
cp .env.example .env
cp backend/.env.example backend/.env
npm ci            # installs frontend AND backend deps (postinstall)
npm run dev
```

Before pushing, run the same checks CI runs:

```bash
npm run lint
npm run typecheck
npm run test:jest
npm test --prefix backend
npm run build
```

Frontend runs on `http://localhost:8081`; the backend API on
`http://localhost:5000` (proxied by Vite in dev).

## 4. Commit

Follow the [commit message convention](../CONTRIBUTING.md#commit-message-convention).

```bash
git add <changed files>
git commit -m "fix(scope): short imperative summary"
```

## 5. Push + open a PR

```bash
git push -u origin fix/describe-the-fix
```

Open a PR to `main`. Fill in the PR template — what changed, why, how it was
tested, any screenshots. CI (`Build & Test`) runs lint, typecheck, tests, and
build automatically. Keep the PR green.

## 6. Review + merge

- At least one maintainer review is required (branch protection).
- Address review comments with additional commits; keep the conversation
  resolved.
- CI must pass. Once approved and green, a maintainer merges (squash).

## 7. After merge

- Your branch is deleted automatically.
- `main` deploys continuously — your change ships when CI + deploy succeed.
- Contributors are recognized in release notes.

## Tips

- Keep PRs small (under ~400 lines when practical). Review is faster and
  conflicts are rarer.
- Don't force-push shared branches; prefer additive commits during review.
- If you're new to the codebase, read the
  [project architecture](../CONTRIBUTING.md#project-architecture) section.
