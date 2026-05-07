# Contributing to NeuroStride

Thank you for your interest in contributing to **NeuroStride** — an AI-powered neurorehabilitation platform! We welcome contributions of all kinds: bug fixes, new features, documentation improvements, and more.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming](#branch-naming)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Project Structure](#project-structure)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Be constructive, patient, and collaborative.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/neurostride.git
   cd neurostride
   ```
3. Follow the setup steps in the [README](./README.md) to get the backend and frontend running.

---

## Development Workflow

```
main          ← stable, production-ready code
└── dev       ← integration branch (open PRs against this)
    ├── feat/your-feature
    ├── fix/your-bugfix
    └── docs/your-docs-update
```

Always branch off `dev`, not `main`.

---

## Branch Naming

| Type        | Pattern                      | Example                         |
|-------------|------------------------------|---------------------------------|
| Feature     | `feat/<short-description>`   | `feat/eeg-band-visualizer`      |
| Bug fix     | `fix/<short-description>`    | `fix/session-end-crash`         |
| Docs        | `docs/<short-description>`   | `docs/hardware-setup-guide`     |
| Refactor    | `refactor/<description>`     | `refactor/pharmacy-router`      |
| Chore       | `chore/<description>`        | `chore/update-dependencies`     |

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(backend): add EMG spike detection endpoint
fix(frontend): resolve WebSocket reconnection on page reload
docs(hardware): add wiring diagram for servo controller
```

---

## Pull Request Guidelines

1. **Keep PRs focused** — one feature or fix per PR.
2. **Write a clear description** explaining *what* and *why*, not just *what*.
3. **Test your changes** before opening a PR.
4. **Do not commit** `.env`, `venv/`, `node_modules/`, or `*.db` files.
5. **Reference issues** in your PR description: `Closes #42`.

---

## Project Structure

```
neurostride/
├── backend/            # FastAPI application
│   ├── agents/         # AI agent logic (Groq LLM)
│   ├── core/           # Database, auth, utilities
│   ├── models/         # SQLAlchemy ORM models
│   ├── routers/        # API route modules
│   └── main.py         # App entry point
├── frontend/           # Next.js 14 application
│   ├── components/     # Reusable UI components
│   ├── context/        # React context providers
│   ├── lib/            # API client & utilities
│   └── pages/          # Next.js pages (doctor, patient, pharmacy)
└── hardware/           # Neuphony EXG Synapse bridge
    └── neuphony_bridge.py
```

---

## Questions?

Open a [GitHub Issue](https://github.com/LTPratham/neurostride/issues) or start a [Discussion](https://github.com/LTPratham/neurostride/discussions).
