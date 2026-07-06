# Sudoku — Zen

A minimalist, earthy-toned Sudoku with 1000+ deterministically-generated levels.
This is a ready-to-run Vite + React + TypeScript + Tailwind project wired up
around the three deliverable files (`src/SudokuEngine.ts`, `src/ThemeConfig.ts`
+ `src/theme.css`, `src/SudokuUI.tsx`).

## Run it

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Build for production

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally to sanity-check it
```

This has already been run once during development (clean `tsc -b` + `vite
build`, zero errors) — it's not just scaffolding, it's confirmed working.

## Project layout

```
index.html              Vite entry HTML
src/main.tsx             Mounts <SudokuApp /> from SudokuUI.tsx
src/index.css            Tailwind's three @tailwind directives
src/theme.css            Design tokens as CSS vars, font imports, resets, a11y floor
src/ThemeConfig.ts       Design tokens as a JS/TS object + tailwind.config extend
src/SudokuEngine.ts      Puzzle generator, solver, difficulty classifier
src/SudokuUI.tsx         The app: grid, input modes, notes, undo/redo, level select
tailwind.config.js       Registers the earthy palette/radii/shadows as Tailwind utilities
```

## Notes

- **Tokens live in two places on purpose.** `tailwind.config.js` can't import
  a `.ts` file directly (Tailwind loads it in plain Node before any
  TypeScript transform runs), so the same color/radius/shadow values are
  mirrored there. If you ever change a value, update both — or migrate to a
  loader like `jiti`/`tsx` if you want one source of truth.
- **Puzzle generation for the hardest tier (Dark Walnut, 22–24 givens) can
  take up to ~1.5s** the first time a given level is generated (it's bounded
  by an internal deadline — see `getPuzzleForLevel` in `SudokuEngine.ts`).
  The UI already shows a "Shaping the grid…" state for this. For a
  production app, consider moving generation into a Web Worker so it never
  touches the main thread at all.
- **Progress and per-level grid state persist to `localStorage`** under keys
  prefixed `sudoku-zen:`. Clear those keys (or your browser's site data) to
  reset progress.
- Icons come from `lucide-react` (already in `package.json`).





