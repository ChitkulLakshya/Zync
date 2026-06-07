<div align="center">
  <img src="public/zync-dark.webp" width="120" />
  <h1>Zync</h1>
  <p>The open-source, AI-powered collaboration platform for modern engineering teams.</p>

  <!-- Badges -->
  <a href="https://github.com/zync-meet/Zync/stargazers"><img src="https://img.shields.io/github/stars/zync-meet/Zync?style=flat-square&color=black&labelColor=black&logo=github&logoColor=white" alt="Stars" /></a>
  <a href="https://github.com/zync-meet/Zync/blob/main/LICENSE"><img src="https://img.shields.io/github/license/zync-meet/Zync?style=flat-square&color=black&labelColor=black" alt="License" /></a>
  <a href="https://github.com/zync-meet/Zync/actions"><img src="https://img.shields.io/github/actions/workflow/status/zync-meet/Zync/ci.yml?style=flat-square&color=black&labelColor=black&logo=github-actions&logoColor=white" alt="Build Status" /></a>
  <a href="https://github.com/zync-meet/Zync/commits/main"><img src="https://img.shields.io/github/last-commit/zync-meet/Zync?style=flat-square&color=black&labelColor=black&logo=github&logoColor=white" alt="Last Commit" /></a>
</div>

<div align="center">
  <br />
  <!-- Replace this placeholder with a real demo.gif of Zync in action! -->
  <img src="https://via.placeholder.com/800x450/000000/FFFFFF/?text=Zync+Platform+Demo+(Add+demo.gif+here)" width="800" alt="Zync Demo" />
</div>

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/zync-meet/Zync.git
cd Zync
npm install
cd backend && npm install && cd ..

# 2. Setup environment variables
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Start development servers
cd backend && npm run dev &
npm run dev
```

That's it! Open `http://localhost:8081` to see it running.

## Features

| Feature | Description |
|:--------|:------------|
| **AI Project Architect** | Generate architecture, tech stack, and roadmaps via Google Gemini |
| **Real-Time Notes** | Conflict-free CRDT block editing (Yjs) with live cursors |
| **Kanban + Git Sync** | Drag-and-drop tasks that automatically sync with GitHub commits & PRs |
| **Instant Chat** | Socket.IO messaging with read receipts and file sharing |
| **Design Inspiration** | Search Dribbble/Behance designs with live scraping and Redis caching |

## Why Zync?

Existing tools for engineering teams are either:
- Fragmented across multiple disjointed platforms (Jira, Slack, Google Docs, GitHub)
- Too expensive for indie developers and small startups
- Not fully open source or lacking built-in AI architecture planning

We built Zync because we wanted a unified, developer-first workspace. A single place where project management, real-time codebase discussion, collaborative documentation, and AI-assisted planning happen seamlessly.

## Meet the Founders

Zync is proudly built and maintained by:

| [<img src="https://github.com/chitkullakshya.png" width="100" style="border-radius:50%" />](https://github.com/chitkullakshya) | [<img src="https://github.com/prem22k.png" width="100" style="border-radius:50%" />](https://github.com/prem22k) | [<img src="https://github.com/eesha264.png" width="100" style="border-radius:50%" />](https://github.com/eesha264) |
|:---:|:---:|:---:|
| **Lakshya Chitkul** | **Prem Sai Kota** | **Eeshitha Gone** |

## Documentation

- [Contributing Guide](docs/CONTRIBUTING.md)
- [Live Demo](https://zync-meet.vercel.app/)

*(For deep architecture, API references, and backend documentation, please explore the `docs` folder or the codebase.)*

## Contributing

We love contributions! See our [Contributing Guide](docs/CONTRIBUTING.md) to get started.

Not sure where to start? Check issues labeled `good first issue` on our [Issues Board](https://github.com/zync-meet/Zync/issues).

For any support, media inquiries, or questions, please contact us at `consolemaster.app@gmail.com`.

## License

[MIT](LICENSE)
