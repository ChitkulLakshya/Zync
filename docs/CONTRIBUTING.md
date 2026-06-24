# Contributing to ZYNC

<!--
  =============================================================================
  CONTRIBUTING.md — ZYNC Platform
  =============================================================================

  This document provides comprehensive guidelines for contributing to ZYNC.
  Following these guidelines helps maintain code quality, ensures consistency
  across the codebase, and makes the review process smoother for everyone.

  Last Updated: June 2026
  =============================================================================
-->

Thank you for your interest in contributing to ZYNC! We welcome contributions
from the community and are grateful for every pull request, bug report, and
feature suggestion we receive.

This document will guide you through the contribution process, from setting up
your development environment to submitting your changes for review.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Fork and Clone](#fork-and-clone)
  - [Install Dependencies](#install-dependencies)
  - [Set Up Environment Variables](#set-up-environment-variables)
- [Development Workflow](#development-workflow)
  - [Branch Naming Convention](#branch-naming-convention)
  - [Making Changes](#making-changes)
  - [Running the Application](#running-the-application)
  - [Testing Your Changes](#testing-your-changes)
- [Coding Standards](#coding-standards)
  - [TypeScript Guidelines](#typescript-guidelines)
  - [React Component Guidelines](#react-component-guidelines)
  - [Electron Main Process Guidelines](#electron-main-process-guidelines)
  - [CSS and Styling Guidelines](#css-and-styling-guidelines)
  - [Documentation Guidelines](#documentation-guidelines)
- [Commit Message Convention](#commit-message-convention)
  - [Commit Types](#commit-types)
  - [Commit Scope](#commit-scope)
  - [Commit Examples](#commit-examples)
- [Pull Request Process](#pull-request-process)
  - [Before Submitting](#before-submitting)
  - [PR Description Template](#pr-description-template)
  - [Review Process](#review-process)
  - [Merge Requirements](#merge-requirements)
- [Issue Guidelines](#issue-guidelines)
  - [Bug Reports](#bug-reports)
  - [Feature Requests](#feature-requests)
  - [Security Vulnerabilities](#security-vulnerabilities)
- [Project Architecture](#project-architecture)
  - [Directory Structure Overview](#directory-structure-overview)
  - [Main Process vs Renderer Process](#main-process-vs-renderer-process)
  - [IPC Communication Patterns](#ipc-communication-patterns)
- [Recognition](#recognition)

---

## Code of Conduct

<!--
  All contributors are expected to follow our Code of Conduct. This ensures
  that the ZYNC community remains welcoming and inclusive for everyone.
-->

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report any
unacceptable behavior to [conduct@zync.io](mailto:conduct@zync.io).

---

## Getting Started

### Prerequisites

<!--
  Before contributing, ensure you have the following tools installed on your
  development machine. These are required for running ZYNC locally.
-->

Ensure you have the following tools installed on your development machine:

| Tool | Minimum Version | Installation |
|------|----------------|-------------|
| **Node.js** | 18.x | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x | Included with Node.js |
| **Git** | 2.x | [git-scm.com](https://git-scm.com/) |
| **Python** | 3.x | [python.org](https://python.org/) |
| **VS Code** | Latest | [code.visualstudio.com](https://code.visualstudio.com/) (recommended) |

**Platform-specific requirements:**

- **Windows**: Visual Studio Build Tools 2019+ (for native module compilation)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `build-essential` package (`sudo apt install build-essential`)

### Fork and Clone

<!--
  The standard GitHub fork-and-clone workflow is used for contributions.
  This ensures that contributors work on their own copy of the repository
  and submit changes through pull requests.
-->

1. **Fork the repository** by clicking the "Fork" button on the
   [ZYNC GitHub page](https://github.com/ChitkulLakshya/Zync)

2. **Clone your fork** to your local machine:
   ```bash
   # Replace YOUR_USERNAME with your GitHub username
   git clone https://github.com/YOUR_USERNAME/Zync.git

   # Navigate into the project directory
   cd Zync
   ```

3. **Add the upstream remote** to keep your fork in sync:
   ```bash
   # Add the original repository as the upstream remote
   git remote add upstream https://github.com/ChitkulLakshya/Zync.git

   # Verify the remotes are set up correctly
   git remote -v
   # origin    https://github.com/YOUR_USERNAME/Zync.git (fetch)
   # origin    https://github.com/YOUR_USERNAME/Zync.git (push)
   # upstream  https://github.com/ChitkulLakshya/Zync.git (fetch)
   # upstream  https://github.com/ChitkulLakshya/Zync.git (push)
   ```

### Install Dependencies

<!--
  Install all project dependencies using npm. This may take several minutes
  depending on your internet connection. Some native modules may need to be
  compiled during installation.
-->

```bash
# Install all dependencies (production + development)
npm install

# Verify the installation by running a type check
npx tsc --noEmit
```

### Set Up Environment Variables

<!--
  The ZYNC application requires certain environment variables to connect to
  Firebase and the backend API. These are stored in a .env file that is
  NOT committed to version control for security reasons.
-->

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your Firebase credentials and API URL
# You can get Firebase credentials from the Firebase Console:
# https://console.firebase.google.com/
```

---

## Development Workflow

### Branch Naming Convention

<!--
  Consistent branch naming makes it easy to understand the purpose of a
  branch at a glance. We use a prefix-based naming convention that
  categorizes branches by their intended change type.
-->

Use the following naming convention for branches:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New feature or enhancement | `feature/global-shortcuts` |
| `fix/` | Bug fix | `fix/tray-icon-not-showing` |
| `docs/` | Documentation changes | `docs/update-api-reference` |
| `refactor/` | Code refactoring | `refactor/ipc-handler-cleanup` |
| `test/` | Adding or updating tests | `test/auto-updater-tests` |
| `ci/` | CI/CD changes | `ci/add-linux-build` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |

**Example workflow:**

```bash
# Create a new feature branch from the latest main
git checkout main
git pull upstream main
git checkout -b feature/my-new-feature
```

### Making Changes

<!--
  When making changes, follow these guidelines to ensure your contributions
  are clean, focused, and easy to review.
-->

1. **Keep changes focused**: Each pull request should address a single concern.
   If you find additional issues while working, create separate branches for them.

2. **Update documentation**: If your changes affect the public API, user-facing
   behavior, or development setup, update the relevant documentation.

3. **Add tests**: New features should include tests. Bug fixes should include a
   test that reproduces the bug to prevent regressions.

4. **Follow existing patterns**: When in doubt, look at how similar functionality
   is implemented elsewhere in the codebase and follow the same patterns.

### Running the Application

<!--
  ZYNC consists of a Vite frontend and a Node.js backend. You can run them
  concurrently using our development scripts.
-->

```bash
# Run both the frontend and backend concurrently
npm run dev:full

# Or run them separately:
# Terminal 1: Run the frontend
npm run dev:frontend

# Terminal 2: Run the backend
npm run dev:backend
```

### Testing Your Changes

<!--
  Before submitting a pull request, ensure your changes pass all tests
  and don't introduce any linting errors or type errors.
-->

```bash
# Run the TypeScript type checker
npx tsc --noEmit

# Run ESLint to check for code style issues
npm run lint

# Run the test suite
npm test

# Run tests in watch mode (useful during development)
npm run test:watch
```

---

## Coding Standards

### TypeScript Guidelines

<!--
  TypeScript is used throughout the ZYNC project. Following these guidelines
  ensures type safety and code consistency across the codebase.
-->

1. **Prefer explicit types** over `any`:
   ```typescript
   // ✅ Good: Explicit type annotation
   function getUser(id: string): Promise<User | null> {
     return userService.findById(id);
   }

   // ❌ Bad: Using any
   function getUser(id: any): any {
     return userService.findById(id);
   }
   ```

2. **Use interfaces for object shapes**:
   ```typescript
   // ✅ Good: Interface for object shape
   interface WindowConfig {
     width: number;
     height: number;
     title: string;
     resizable?: boolean;
   }

   // ❌ Bad: Inline object type
   function createWindow(config: { width: number; height: number; title: string }) {}
   ```

3. **Use enums or const objects for fixed values**:
   ```typescript
   // ✅ Good: Const object with type assertion
   const IPC_CHANNELS = {
     DOWNLOAD_PLATFORM: 'download-platform',
     OPEN_SETTINGS: 'open-settings',
     CHECK_UPDATES: 'check-for-updates',
   } as const;
   ```

4. **Prefer `readonly` for immutable properties**:
   ```typescript
   interface AppConfig {
     readonly appId: string;
     readonly version: string;
     theme: 'light' | 'dark' | 'system';
   }
   ```

### React Component Guidelines

<!--
  React components in ZYNC follow specific patterns to ensure consistency,
  reusability, and maintainability.
-->

1. **Use functional components** with TypeScript interfaces for props:
   ```typescript
   interface ButtonProps {
     /** The text content of the button */
     label: string;
     /** Click handler function */
     onClick: () => void;
     /** Optional variant for styling */
     variant?: 'primary' | 'secondary' | 'danger';
     /** Whether the button is disabled */
     disabled?: boolean;
   }

   const Button: React.FC<ButtonProps> = ({
     label,
     onClick,
     variant = 'primary',
     disabled = false,
   }) => {
     return (
       <button
         className={`btn btn-${variant}`}
         onClick={onClick}
         disabled={disabled}
       >
         {label}
       </button>
     );
   };
   ```

2. **Use custom hooks** to extract reusable logic:
   ```typescript
   // ✅ Good: Custom hook for window resize
   function useWindowSize() {
     const [size, setSize] = useState({ width: 0, height: 0 });

     useEffect(() => {
       const handleResize = () => {
         setSize({ width: window.innerWidth, height: window.innerHeight });
       };

       window.addEventListener('resize', handleResize);
       handleResize();

       return () => window.removeEventListener('resize', handleResize);
     }, []);

     return size;
   }
   ```

3. **Organize component files** consistently:
   - Imports (React, third-party, local)
   - Interface/type definitions
   - Component definition
   - Sub-components (if any)
   - Export statement

### Backend Development Guidelines

<!--
  The backend API is built with Node.js and Express. Follow these guidelines
  when working in the backend directory.
-->

1. **Always validate incoming requests** using middleware (like Zod) or explicitly checking `req.body`.
2. **Handle errors gracefully**: Use try-catch blocks and send appropriate HTTP status codes, never crash the server.
3. **Keep controllers focused**: Delegate complex business logic to the `services/` directory.

### CSS and Styling Guidelines

<!--
  ZYNC uses Tailwind CSS across the entire React frontend.
-->

1. **Use Tailwind CSS** classes for all styling in React components.
2. **Follow existing design tokens** defined in the `tailwind.config.ts`.
3. **Support both light and dark themes** using Tailwind's `dark:` variant and CSS custom properties.

### Documentation Guidelines

<!--
  Good documentation is essential for maintaining a large codebase.
  Follow these guidelines when writing comments and documentation.
-->

1. **Document all exported functions and classes** with JSDoc comments
2. **Include @param and @returns** tags for function documentation
3. **Explain "why"** in comments, not just "what"
4. **Update README.md** when adding new features or changing the setup process
5. **Include code examples** in documentation for complex APIs

---

## Commit Message Convention

<!--
  We follow the Conventional Commits specification for all commit messages.
  This enables automated changelog generation and semantic versioning.
  
  Reference: https://www.conventionalcommits.org/
-->

We use the [Conventional Commits](https://www.conventionalcommits.org/)
specification for commit messages. This enables automated changelog generation
and makes it easier to understand the history of changes in the project.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature or enhancement | `feat: add system tray icon` |
| `fix` | Bug fix | `fix: resolve window flicker on startup` |
| `docs` | Documentation changes | `docs: update installation guide` |
| `style` | Code style changes (formatting, etc.) | `style: fix indentation in menu.ts` |
| `refactor` | Code refactoring (no feature/fix) | `refactor: extract IPC handlers` |
| `test` | Adding or updating tests | `test: add auto-updater unit tests` |
| `chore` | Maintenance tasks | `chore: update electron to v28` |
| `ci` | CI/CD changes | `ci: add macOS build to workflow` |
| `perf` | Performance improvements | `perf: optimize window creation` |

### Commit Scope

<!--
  The scope provides additional context about what area of the codebase
  the commit affects. Common scopes for the ZYNC project include:
-->

| Scope | Description |
|-------|-------------|
| `frontend` | React frontend application |
| `backend` | Node.js backend API |
| `docs` | Documentation and architecture notes |
| `ci` | GitHub Actions and workflows |
| `deps` | Dependency updates |
| `design` | UI/UX adjustments |

### Commit Examples

```bash
# Feature with scope
feat(frontend): add notification count badge to header

# Bug fix with body
fix(backend): prevent duplicate project creation

Previously, rapid requests could create duplicate projects. Now there is
a database constraint and rate-limiting to prevent it.

# Breaking change
feat(backend)!: restructure API endpoints

BREAKING CHANGE: All API endpoints now prefix with `/api/v2/`.
Update any frontend services that reference the old endpoints.
```

---

## Pull Request Process

### Before Submitting

<!--
  Complete this checklist before submitting your pull request to ensure
  it meets our quality standards and can be reviewed efficiently.
-->

- [ ] Code compiles without errors (`npx tsc --noEmit`)
- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Documentation is updated (if applicable)
- [ ] Tests are added for new functionality
- [ ] Commit messages follow the Conventional Commits spec
- [ ] Branch is up-to-date with main
- [ ] PR description explains the changes and includes screenshots (if UI change)

### PR Description Template

<!--
  Use this template when creating pull requests. It helps reviewers
  understand the context and impact of your changes.
-->

```markdown
## Description
[Describe what this PR does and why]

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Screenshots (if applicable)
[Add screenshots or GIFs demonstrating the change]

## Testing
[Describe how you tested the changes]

## Checklist
- [ ] Code follows the project's coding standards
- [ ] Self-review of the code has been performed
- [ ] Comments have been added for complex logic
- [ ] Documentation has been updated
- [ ] Tests have been added/updated
- [ ] All tests pass locally
```

### Review Process

<!--
  All pull requests go through a review process to ensure code quality
  and catch potential issues before merging.
-->

1. **Automated Checks**: GitHub Actions will run linting, type checking, and
   tests on every pull request. All checks must pass before a review is started.

2. **Code Review**: At least one maintainer will review the code for:
   - Correctness and completeness
   - Code quality and adherence to guidelines
   - Security implications
   - Performance impact
   - Test coverage

3. **Feedback**: Reviewers may request changes. Address all feedback and
   push additional commits to the same branch.

4. **Approval**: Once approved, a maintainer will merge the PR.

### Merge Requirements

<!--
  These conditions must be met before a pull request can be merged into
  the main branch. These requirements ensure code quality and stability.
-->

- All automated checks pass (linting, tests, type checking)
- At least one approval from a maintainer
- No unresolved review comments
- Branch is up-to-date with main (no merge conflicts)
- PR description is complete and accurate

---

## Issue Guidelines

### Bug Reports

<!--
  Bug reports help us improve ZYNC. Please provide as much detail as
  possible to help us reproduce and fix the issue quickly.
-->

When reporting a bug, include:

1. **Environment**: OS version, Node.js version, Electron version
2. **Steps to Reproduce**: Clear, numbered steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Screenshots/Logs**: Any relevant screenshots or log output
6. **Workarounds**: Any workarounds you've found

### Feature Requests

<!--
  Feature requests help us understand what users need from ZYNC.
  Well-written feature requests with clear use cases are more likely
  to be implemented.
-->

When requesting a feature, include:

1. **Problem Statement**: What problem does this feature solve?
2. **Proposed Solution**: How would you like this feature to work?
3. **Alternatives**: Have you considered any alternative approaches?
4. **Additional Context**: Any screenshots, mockups, or examples

### Security Vulnerabilities

<!--
  Security vulnerabilities should NOT be reported through public issue
  trackers. This prevents potential exploitation before a fix is available.
-->

**Do NOT report security vulnerabilities through public GitHub issues.**

Please report security vulnerabilities via email to
[security@zync.io](mailto:security@zync.io). You will receive a response
within 48 hours. See our [Security Policy](security/SECURITY.md) for more details.

---

## Project Architecture

### Directory Structure Overview

<!--
  Understanding the project structure is essential for making meaningful
  contributions. The project follows a clear separation between the
  backend API and the React frontend.
-->

```
backend/            → Node.js + Express API server
├── controllers/    → Request handlers (auth, users, projects)
├── models/         → Mongoose database schemas
├── routes/         → Express API routing
├── services/       → Core business logic (AI generation, scraping)
├── index.js        → Backend entry point

src/                → Renderer process (React + Vite Frontend)
├── components/     → Reusable React components (UI, specific features)
├── hooks/          → Custom React hooks
├── lib/            → Utility functions and Firebase configuration
├── pages/          → Top-level route components
├── services/       → Frontend API clients and socket handlers
├── App.tsx         → Root application component

docs/               → Deep-dive documentation and architecture blueprints
scripts/            → Automation scripts (build, prepare)
```

### Backend vs Frontend Process

<!--
  Code placed in the wrong environment will cause runtime errors.
-->

| Aspect | Backend API | Frontend |
|--------|-------------|-----------------|
| **Environment** | Node.js | Browser |
| **File Location** | `backend/` | `src/` |
| **Access** | Full OS/DB access | Sandboxed |
| **Examples** | Database queries, WebRTC signaling | UI components, user interaction |

---

## Recognition

<!--
  We believe in recognizing the contributions of our community members.
  All contributors are listed in the project's README and release notes.
-->

All contributors are recognized in the project. We use the
[All Contributors](https://allcontributors.org/) specification to 
acknowledge every type of contribution, not just code.

Types of contributions we recognize:

- 💻 Code
- 📖 Documentation
- 🐛 Bug Reports
- 💡 Feature Suggestions
- 🎨 Design
- 🔧 Infrastructure
- ⚠️ Tests
- 🌍 Translation

---

Thank you for contributing to ZYNC! Your efforts help make this project
better for everyone. If you have any questions about the contribution
process, feel free to open a discussion on the GitHub repository or
reach out to the maintainers.
