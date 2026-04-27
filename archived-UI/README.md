# Archived UI — Desk / Monitor / Notebook design

These files are a snapshot of the original "workspace" UI before the redesign
to the standard MAC Products dashboard layout. Kept here for reference / future
revival.

## What was here

The original UI rendered the app as a physical desk scene:
- **`.wall`** — fixed background photo (industrial loft from Unsplash) covering
  the top 75% of the viewport.
- **`.desk-surface`** — wooden desk filling the bottom 25%.
- **Notebook panels** (left/right) — paper-textured cards with thick black /
  blue spines, antigravity hover animations, and rotated task cards.
- **Computer monitor** — chrome bezel with gradient frame, neck, and base
  enclosing the calendar grid.

## Files
| File | Original location | Notes |
|------|-------------------|-------|
| `index.css` | `src/index.css` | Contains `.wall`, `.desk-surface`, `#monitor`, `.stand-neck`, `.stand-base`, `#task-panel` / `#delegation-panel` decorations, `@keyframes antigravity`. |
| `App.tsx` | `src/App.tsx` | Renders `.mac-logo-container`, `.wall`, `.desk-surface` outside the workspace. |
| `CalendarMonitor.tsx` | `src/components/CalendarMonitor.tsx` | Wraps the calendar in `#monitor-assembly` → `#monitor` → `.monitor-screen` with stand neck/base. |

## To restore

Copy these files back over the current `src/...` paths. Note that any features
added after archival (Outlook sync, delete button, pending delegation, etc.)
will need to be merged in manually since these snapshots are pre-redesign.
