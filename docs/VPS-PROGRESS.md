# Private VPS progress storage

This fork adds optional server persistence for one learner behind an authenticated reverse proxy. Everyone with access to this deployment shares the same progress. It is not a multi-user account service.

Set these runtime variables on the existing Node application:

```
COJUDGE_SERVER_PROGRESS_DIR=/data/progress
COJUDGE_SERVER_PROGRESS_ORIGIN=https://cojudge.musel.dev
BODY_SIZE_LIMIT=5M
```

The directory must be a persistent, private volume. Keep the application port on loopback and retain the existing nginx HTTP authentication. The API is disabled unless both progress variables are set. PUT requires the configured browser Origin, JSON content and the explicit sync header. Run one application process against this directory; its write queue is in-process.

## Saved data

Code solutions, workspace files (including dotfiles), completed-problem flags, bookmarks, custom tests and game results are included. Browser settings, Firebase credentials, whiteboard drawings and pasted images are not included. Existing browser export remains available for those items.

Browser storage remains the offline copy. The first visit imports into an empty server. A fresh browser restores before the editor opens. Saves start after a 500 ms debounce; a three-second poll catches other changes and checks for server updates. Wait for **Saved to VPS** before closing the browser. Closing a browser before acknowledgement can leave the final edit only in that browser; reopening retries it.

Server status is separate from the existing local save indicator. Network or disk errors never show a successful server save. If both browser and server changed, writes stop for review. **Save this browser copy** uses a revision check and keeps the previous server revision. **Use server copy** first stores the displaced browser data under `cojudge-vps-conflict-<timestamp>` in browser local storage. That key is intentionally excluded from ordinary exports; recover it directly if needed.

## Storage and recovery

- `/data/progress/current.json`: the latest acknowledged snapshot, including revision and save time.
- `/data/progress/history/<revision>.json`: the latest 100 snapshots. These are earlier versions on the same disk, not an independent disaster-recovery backup.
- Snapshot files have mode 0600; new directories have mode 0700.

Writes use a private temporary file, fsync, atomic rename and directory fsync. The history copy is written before the current copy. Invalid existing storage causes an error instead of being silently reset.

Back up the entire progress directory with the existing VPS backup process. Do not commit it. To recover an older revision, stop the application, copy the directory to a separate recovery location, inspect the chosen history file, and restore it as a **new revision greater than the current revision**. Restart the application and resolve browser conflicts explicitly. Do not lower the revision or run two application containers against the same progress directory.

## Verification

```
npm test -- --run
npm run build
COJUDGE_SYNC_E2E=1 npx playwright test --config playwright.server-progress.config.ts
```

The browser test starts a separate local Node server and a temporary data directory. It uses installed Google Chrome in headless mode. It does not use the live VPS or the learner's browser profile.

Upstream v0.8.7 has 30 pre-existing Svelte/type errors and 29 warnings. Compare `npm run check` with that baseline; this feature must add none.
