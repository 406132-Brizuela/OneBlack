# OneBlack

OneBlack is a desktop orchestrator for AI agents and workspaces: one place to reach your
projects and put agents to work on them.

It is in early development. Today it ships the application shell and workspace management:

- Register a project folder through the native folder picker. OneBlack stores its name,
  path and an automatically assigned color.
- Each open workspace gets its own tab. The sidebar keeps a fixed order (registration) and
  the home screen lists workspaces most recently opened first. Open tabs survive restarts.
- Closing a tab (button or middle click) keeps the workspace registered.
- See the current git branch of each workspace, read locally from `.git` (no network, no
  `gh`, no git commands executed). It refreshes when the window regains focus.

| Shortcut                      | Action                                      |
| ----------------------------- | ------------------------------------------- |
| `Ctrl+1` … `Ctrl+9`           | Open the workspace at that sidebar position |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab                         |

## Stack

- [Electron](https://www.electronjs.org/) with separate main, preload and renderer processes
- [TypeScript](https://www.typescriptlang.org/) in strict mode
- [React](https://react.dev/) for the renderer
- [electron-vite](https://electron-vite.org/) (Vite) for development and builds
- [Vitest](https://vitest.dev/) for unit tests and [Playwright](https://playwright.dev/) for
  end-to-end tests

## Getting started

Requirements: Node.js 22.12 or newer, npm, and git (only needed by the tests). Development and
testing happen on Windows.

```sh
npm install        # also downloads the Electron binary
npm run dev        # run with hot reload
```

| Command             | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Start the app in development mode                     |
| `npm run build`     | Type-check and build into `out/`                      |
| `npm start`         | Run the production build (builds it first)            |
| `npm run typecheck` | Type-check the main, preload and renderer code        |
| `npm run lint`      | Lint the whole project                                |
| `npm test`          | Unit tests                                            |
| `npm run test:e2e`  | Build and drive the real app from end to end          |
| `npm run verify`    | Everything CI checks: run it before pushing           |

There is no installer yet: packaging is on the roadmap.

## Contributing

Work happens on `feat/`, `fix/`, `chore/` or `docs/` branches created from `develop`, with
conventional commit messages. `develop` and `main` only change through pull requests, and a
pull request can be merged once the `verify` check passes. It runs lint, type-check, build, unit
and end-to-end tests on Windows with GitHub Actions.

## Project structure

```text
src/
├── main/              Main process: the only place with filesystem and OS access
│   ├── git/           Read-only git status from .git metadata
│   ├── security/      Custom protocol, navigation and permission guards, IPC sender checks
│   ├── storage/       Atomic JSON file access
│   ├── tabs/          Open tab session and its persistence
│   ├── workspaces/    Model, JSON persistence, service and IPC handlers
│   ├── index.ts       Application bootstrap
│   └── window.ts      Main window and its web preferences
├── preload/           contextBridge API exposed to the renderer
├── renderer/          React UI
│   └── src/
│       ├── components/  Layout shell and workspace views
│       ├── hooks/       UI state and calls to the exposed API
│       ├── navigation/  Sidebar order and keyboard shortcuts
│       └── styles/      Terminal Neon theme (CSS custom properties) and styles
└── shared/            Types, IPC contract and Content Security Policy
tests/e2e/             End-to-end tests
```

## Data

Workspaces are saved in `workspaces.json` inside the app's `userData` folder
(`%APPDATA%\OneBlack Desktop` on Windows). The folder is deliberately different from
`%APPDATA%\OneBlack`, which belongs to the earlier C# application.

Open tabs are saved separately in `tabs.json`.

Writes are atomic. If `workspaces.json` is invalid, OneBlack reports it and leaves it untouched
instead of overwriting it. An invalid `tabs.json` is disposable and simply ignored.

## Security posture

The renderer is treated as untrusted.

- **Process isolation:** `contextIsolation` on, `nodeIntegration` off, renderer sandbox enabled
  for the whole app, `<webview>` disabled.
- **Capability-based IPC:** the preload exposes only the `workspaces` actions `list`, `register`,
  `open`, `close` and `showHome`. The renderer never receives `ipcRenderer` or Node objects, and never
  sends filesystem paths: new paths come exclusively from the native dialog.
- **IPC validation:** handlers accept calls only from the main frame of the app's own origin,
  validate their arguments and do not forward internal error details.
- **Strict CSP:** everything is denied by default; only the app's own scripts and styles load,
  with no `unsafe-inline` or `unsafe-eval`, and no network connections. Development adds a
  per-run nonce and same-origin connections for hot reload.
- **Custom `app://` protocol:** the production UI is not loaded over `file://`, and requests
  cannot escape the renderer folder.
- **Locked-down web contents:** new windows, external navigation and all permission requests are
  denied.
- **Safe git reads:** branches are read from files, so a repository's configuration cannot run
  commands, and a local repository cannot redirect reads to a network share.

API keys are **not** handled yet. The planned vault is write-only (keys can be used, rotated and
deleted, never read back by the UI) and will live entirely in the main process.

## Roadmap

1. Embedded terminal (xterm.js and node-pty) in the tab bar
2. Launch any agent CLI by command inside a workspace
3. Write-only key vault (Argon2id, AES-256-GCM and Electron `safeStorage`), injecting keys as
   environment variables into agent processes
4. Workspace search (`Ctrl+Shift+K`), pinning, reordering, renaming, recoloring and removal
5. Packaging, installer and Electron fuses
6. GitHub integration through the `gh` CLI
