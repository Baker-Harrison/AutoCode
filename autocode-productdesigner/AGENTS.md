# AGENTS.md

This is an Electron-based IDE application built with React, TypeScript, Vite, and Tailwind CSS.

## Build / Lint / Test Commands

- **Install dependencies**
  - `cd autocode-productdesigner && npm install`
  - `cd autocode-productdesigner && npm run postinstall` (rebuilds node-pty native module)

- **Run development server**
  - `cd autocode-productdesigner && npm run dev` (runs Vite dev server + Electron with hot reload)

- **Build for production**
  - `cd autocode-productdesigner && npm run build` (builds Vite renderer, output in `dist/`)

- **Start Electron app**
  - `cd autocode-productdesigner && npm start` (requires build first)

- **Type check**
  - TypeScript strict mode is enabled in `tsconfig.json`. No separate typecheck script - build will fail on type errors.

- **Lint**
  - No ESLint configured. Code style follows Prettier-like conventions (enforced by editor).

- **Tests**
  - No test framework configured yet. When adding tests, use Vitest for consistency with Vite.

## Code Style Guidelines

### General Principles
- Prefer small, focused functions with clear inputs/outputs.
- Avoid unnecessary abstraction; keep changes minimal and localized.
- Use existing project patterns and naming conventions.
- Keep side effects explicit and easy to follow.

### Imports
- Use absolute imports with `@/` alias (mapped to `renderer/src/*`).
- Group imports: React imports first, then third-party, then local imports.
- Prefer named imports: `import { useState } from "react"` not `import React from "react"`.
- Keep a single blank line between import groups.
- CSS imports for libraries like xterm should come before component imports.

### Formatting
- Use 2 spaces for indentation (TS/JS convention in this project).
- Use double quotes for strings.
- Use Prettier defaults for all formatting rules.
- Keep line length reasonable (around 100 chars).
- Use trailing commas in multiline objects/arrays.

### Types and Annotations
- Enable strict mode in TypeScript.
- Use explicit types for state: `useState<string[]>([])` not `useState([])`.
- Avoid `any`; use `unknown` or specific types instead.
- Use interfaces for object shapes, type aliases for unions/primitives.
- Define shared types in `renderer/src/types/` directory.

### Naming Conventions
- Components: `PascalCase` for files and component functions.
- Hooks: `camelCase` with `use` prefix.
- Variables and functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` or `camelCase` for module-level constants.
- Interfaces: `PascalCase` with descriptive names (`TerminalTab`, not `ITerminalTab`).

### React Patterns
- Use functional components with hooks.
- Use `useCallback` for functions passed as dependencies.
- Use `useRef` for DOM references and mutable values that don't trigger re-renders.
- Use `forwardRef` for components that need to expose DOM refs.
- Destructure props with type annotations.

### Error Handling
- Use `try/catch` for async operations with user feedback.
- Show toast notifications for user-facing errors via `useToast` hook.
- Log errors to console with descriptive messages.
- Include context in error messages (ids, filenames, state).

### Tailwind CSS
- Use `zed-*` color variables from tailwind config for theme consistency.
- Structure: `className="flex items-center gap-2 px-4 py-2 bg-zed-bg text-zed-text"`.
- Use `cn()` utility from `@/lib/utils` for conditional classes.
- Avoid arbitrary values; extend theme in `tailwind.config.ts` if needed.

### Component Structure
- Co-locate small components in the same file or same directory.
- Use `class-variance-authority` (cva) for button variants (see `button.tsx`).
- Follow pattern: imports, types/interfaces, constants, component.

### State Management
- Use local component state with `useState` for UI state.
- Use `useSettings` hook for app-wide settings (persisted to localStorage).
- Use React Context if sharing state across many components.

## Cursor / Copilot Rules

- No Cursor rules found (`.cursor/rules/` or `.cursorrules` not present).
- No GitHub Copilot instructions found (`.github/copilot-instructions.md`).

## Notes

- Node.js 22.x required (specified in `package.json` engines).
- The `renderer/src/` directory contains all React/TypeScript source code.
- The `electron/` directory contains Electron main process code.
- Native modules like `node-pty` require rebuilding on install via `electron-rebuild`.
- If the integrated terminal shows `posix_spawnp failed` or `TTY read: Input/output error`, rebuild `node-pty` for Electron (e.g. `npm rebuild node-pty --runtime=electron --target=33.2.0 --dist-url=https://electronjs.org/headers`) and restart the app.
