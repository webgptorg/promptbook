# Non-functional requirements

## Technology

-   The page is a **Next.js** (App Router) application located at `apps/coder-landing` in the Promptbook monorepo, styled with Tailwind CSS.
-   It follows the conventions of the other apps in `apps/` (shared root `node_modules`, `experimental.externalDir`, `@promptbook-local/*` path aliases).
-   Static content is rendered on the server; only interactive components (copy buttons, live terminal, mobile menu, Book editor embed) are client components.

## Port & scripts

-   Development and production servers run on port **4025** (`npm run dev` / `npm run start`).
-   `npm run build` must succeed with zero errors; `npm run lint` runs `next lint --max-warnings=0`.
-   The app is registered in `apps/README.md` and `.vscode/terminals.json`.

## Single source of truth (DRY)

-   Canonical page data (commands, harness catalog, links, demo script, agent source) lives in one data module per concern (`src/data/`), mirrored 1:1 by the specs in [`content/`](./content/). No command or catalog value may be duplicated as a string in two components.
-   The live terminal agent visual uses the shared `src/avatars` renderer, matching Agents Server avatar rendering and the `ptbk coder` terminal ASCII bridge.
-   The specs in this folder must allow a 1:1 re-implementation of the page without the source code (see [`README.md`](./README.md)).

## Accessibility

-   Interactive controls (copy button, hamburger menu) have `aria-label`s; the hamburger exposes `aria-expanded`.
-   Decorative elements (traffic-light dots, glows, logos next to text) are `aria-hidden`.
-   All nav landmarks (`header`, `nav`, `main`, `footer`) are semantic elements; footer columns are `<nav aria-label>`.
-   Text contrast targets WCAG AA on the dark background.
-   The page remains fully readable with JavaScript disabled except for the animated live terminal (which may then stay empty) and copy buttons.

## Performance

-   No third-party scripts, no analytics, no external font/CDN calls except Google Fonts via `next/font` (self-hosted at build time).
-   Images (logos) are served via `next/image` from `public/`.
-   The animated live terminal uses plain `setTimeout` scheduling — no animation libraries.
