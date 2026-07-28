# AGENTS.md

Quick orientation for OpenCode sessions working in this repo.

## What this is

Single-page personal portfolio for Neel Panging — **Vite + React 18 + TypeScript + shadcn/ui + Tailwind**.
Two routes wired in `src/App.tsx`:

- `/` → `src/pages/Game.tsx` → `src/components/GameCanvas.tsx` (HTML5 canvas 8-bit platformer)
- `/terminal` → `src/components/Terminal.tsx` (zsh-style interactive resume)

## Commands

```sh
npm i            # install
npm run dev      # dev server on http://localhost:8080 (vite.config.ts)
npm run build    # production build → dist/
npm run build:dev # production build in dev mode (useful for debugging prod bundling)
npm run preview  # serve dist/
npm run lint     # eslint .
npm run test     # vitest run (single run)
npm run test:watch
```

No typecheck script is wired up. `tsc` is not invoked anywhere — `npm run build` relies on `vite build`. Don't add a `tsc --noEmit` script without checking with the owner.

## Layout that matters

- `src/game/*.ts` — **vanilla TS** game core (`game.ts`, `render.ts`, `level.ts`, `constants.ts`, `audio.ts`). Not React. Loaded by `GameCanvas.tsx`.
- `src/components/game/Game.tsx` (1619 LOC) — **dead/orphan code from the Lovable scaffold**. Never imported. Safe to delete; do not edit.
- `src/pages/Index.tsx` — also orphan. Not referenced by `App.tsx`. Safe to delete.
- `src/components/Terminal.tsx` — Terminal UI; command grammar lives inline in this file.
- `src/data/resumeData.ts` — source of truth for terminal command output. Update here, not in `Terminal.tsx`.
- `src/components/ui/*` — shadcn-generated. Add new ones via `npx shadcn@latest add <name>` (aliases already set in `components.json`).

## Config quirks

- Path alias `@/*` → `./src/*` (declared in `vite.config.ts`, `vitest.config.ts`, and `tsconfig.json`).
- `tsconfig.app.json` is intentionally loose: `strict: false`, `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`. Don't "tighten" without asking — the code relies on it.
- ESLint disables `@typescript-eslint/no-unused-vars` entirely. Lint passes will not flag dead vars.
- `vite.config.ts`: dev server binds `::` (all interfaces) port 8080 with `hmr.overlay: false` — useful when the HMR error overlay would otherwise swallow the canvas.
- Tailwind is v3 (NOT v4), via PostCSS. Tailwind config in `tailwind.config.ts`; tokens are CSS variables in `src/index.css`.
- Dev container (`.devcontainer/devcontainer.json`) is stale — references Python/Streamlit from a prior project. Ignore or replace.

## Tests

- Vitest + jsdom, globals enabled, setup file `./src/test/setup.ts` (defines a `matchMedia` mock).
- Test files only match `src/**/*.{test,spec}.{ts,tsx}`. The only test is `src/test/example.test.ts` — a placeholder.
- There is no coverage threshold or snapshot config.

## Style / workflow

- shadcn/ui components use the default Slate base color; new components must respect the existing CSS variable token system (`hsl(var(--...))`).
- The Terminal component handles its own command parsing, history, and tab-completion — extend those handlers in place rather than introducing a parser library.
- The game uses `imageRendering: 'pixelated'`; any new sprite work must keep pixel-art scaling crisp.
- Commit history is the source of truth for intent — no PR/CI/release conventions documented in-repo, so default to small focused commits.
