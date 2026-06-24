<div align="center">
  <!-- Replace this placeholder with your actual logo -->
  <img src="https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=150&auto=format&fit=crop" width="150" style="border-radius: 20%; margin-bottom: 20px;" alt="Zync Logo" />
  
  <h1>Zync</h1>
  <p><b>An open-source, AI-native collaborative workspace. Plan, design, and write together in real-time.</b></p>
  
  <p>
    <a href="https://zync.app">Home Page</a> •
    <a href="https://discord.gg/yourlink">Discord</a> •
    <a href="https://demo.zync.app">Live Demo</a> •
    <a href="docs/architecture/tech_stack_overview.md">Documentation</a>
  </p>

  <p>
    <a href="https://github.com/zync-meet/Zync/stargazers"><img src="https://img.shields.io/github/stars/zync-meet/Zync?style=for-the-badge&color=000000" alt="Stars" /></a>
    <a href="https://github.com/zync-meet/Zync/blob/main/LICENSE"><img src="https://img.shields.io/github/license/zync-meet/Zync?style=for-the-badge&color=000000" alt="License" /></a>
    <a href="https://github.com/zync-meet/Zync/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"><img src="https://img.shields.io/github/issues/zync-meet/Zync/good%20first%20issue?style=for-the-badge&color=000000" alt="Good First Issues" /></a>
  </p>

  <br />
  <!-- A high quality 15-second GIF of Zync's AI or real-time typing goes here -->
  <img src="https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=800&auto=format&fit=crop" width="800" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" alt="Zync UI Demo" />
</div>

<br/>

## What is Zync?

Modern teams are forced to fragment their workflows across five different apps: one for whiteboarding, one for docs, one for tasks, and another for AI. 

**Zync is an open-source, all-in-one workspace.** We merge real-time document editing, visual canvasing, and project management into a single, local-first platform—supercharged by multi-modal AI to automate the busywork. Your data, your servers, your workflow.

## Features

| Feature | Description |
|:---|:---|
| 📝 **Hyper-fused Editor** | Docs and whiteboards fully merged using a flexible, block-based architecture. |
| 🤖 **Multimodal AI Partner** | Deep integration with Gemini & Groq. Generate project plans, code, or outlines instantly. |
| ⚡️ **Zero-Latency Sync** | Conflict-free real-time collaboration powered by Yjs (CRDTs) and WebSockets. |
| 🔄 **Kanban GitHub Sync** | Bidirectional synchronization between Zync project boards and GitHub Issues. |
| 🏗️ **Self-Hostable** | Own your data. Deploy Zync on your own infrastructure with Docker & Terraform. |

## Quick Start

Setting up Zync locally is frictionless. Our workspace automation handles the rest.

```bash
git clone https://github.com/zync-meet/Zync.git
cd Zync

# Install dependencies for both frontend and backend
npm install

# Configure environments
cp .env.example .env
cp backend/.env.example backend/.env

# Boot the full application stack
npm run dev
```

*The Frontend will be running at `http://localhost:5173` | The Backend API will be running at `http://localhost:8081`*

## Ecosystem & Upstreams

Zync stands on the shoulders of open-source giants. We want to thank the following projects that make Zync possible:

* **[Yjs](https://yjs.dev/)**: The fundamental CRDT engine powering our real-time state management.
* **[React](https://react.dev/) & [Vite](https://vitejs.dev/)**: For a blazing fast, component-driven frontend.
* **[Socket.IO](https://socket.io/)**: Enabling low-latency, bidirectional communication.
* **[Prisma](https://www.prisma.io/) & [MongoDB](https://www.mongodb.com/)**: Our robust database ORM and storage layer.

## Documentation

Dive deeper into Zync's internals in our `docs/` folder:

- 🏗️ [Architecture & Tech Stack](docs/architecture/tech_stack_overview.md)
- 🔒 [Security & Auth Architecture](docs/architecture/security_and_auth_architecture.md)
- 🚀 [Performance Strategy & Audit](docs/audit/PERFORMANCE_AUDIT.md)

## Contributing

We are building a vibrant, open-source community and we'd love for you to join us!

1. Read our [Contributing Guide](docs/CONTRIBUTING.md) to understand our workflow.
2. Check out our [Issues Board](https://github.com/zync-meet/Zync/issues) and look for issues labeled `good first issue`.
3. Join our [Discord](#) to chat with the core team.

## License

Zync is open-source software licensed under the MIT License.
