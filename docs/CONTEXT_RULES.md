# ARGUS Context Rules

Rules for Claude to follow every session working on this project.

---

## Session Start Protocol

1. **Always read `CLAUDE.md` and `docs/PHASE_LOG.md` before doing anything.** These are your memory. They tell you what the project is, what works, what's broken, and what to do next.

2. **Tell the user where we left off.** After reading, give a 2-3 line summary of current state and what's next.

---

## Session End Protocol

1. **Always update `docs/PHASE_LOG.md`** at the end of every session with:
   - **Completed** — what was finished this session
   - **In Progress** — what's partially done
   - **Next** — priority order for next session
   - **Known Bugs** — anything broken or flaky
   - **Files Touched** — every file modified this session

2. **Update `CLAUDE.md`** if any of these changed:
   - Tech stack versions
   - New finalized files
   - Build phase progression
   - New environment variables

---

## Working Rules

1. **Use `/compact` when conversation gets long** — before hitting token limits, compact to preserve context.

2. **Only read spec docs relevant to the current task** — `ARGUS_BUILD_BIBLE.md` is 48KB. Don't read the whole thing. Use targeted searches.

3. **Never modify files listed as finalized in `CLAUDE.md`** without explicit user confirmation. Currently finalized:
   - `apps/web/src/index.css`
   - `apps/web/src/stores/commandStore.ts`
   - `apps/web/vite.config.ts`
   - `ARGUS_BUILD_BIBLE.md`

4. **When starting a new feature, state which spec section you are implementing** — reference the ARGUS_BUILD_BIBLE.md phase/section.

5. **Globe must never break** — always test after changes to Globe.tsx or any layer component. The 3 Laws apply.

6. **Cesium Ion is permanently disabled** — never re-enable it. We use Esri World Imagery via UrlTemplate. The `vite-plugin-cesium` only handles static asset serving.

7. **Data sources are real** — ADS-B flights, CelesTrak satellites, OSM landmarks are all live data. Vessels are currently simulated but should be replaced with AISStream when ready.

8. **Test in the preview browser** — use `preview_start`, `preview_screenshot`, `preview_console_logs` to verify changes work. Don't ask the user to check manually.
