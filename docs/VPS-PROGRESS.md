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

Restoring server data reloads open tabs. An origin-wide restore marker stops old editors and page teardown from writing stale tabs back into the new snapshot.

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

## Deployment record — October 26, 2026

- Running application: `cojudge-vps`, image `cojudge:vps-cef3d5cba8844d4e7f9f93c14133c8d5b23f840a`.
- nginx keeps the original HTTPS and HTTP authentication. It forwards to loopback port 5378.
- Existing content volume `cojudge-trial-data` remains mounted at `/data`. Progress is under `/data/progress`; existing courses remain in their original directories.
- The original `cojudge` container is stopped and retained for rollback. The isolated verification container and volume were removed.
- Pre-deployment configuration and content backup: `/home/ubuntu/cojudge-backups/pre-vps-sync.ILTC5V/`. The runtime environment backup is private. No credentials or learner data are in this repository.
- Browser and post-deployment progress backups are also kept locally under `/home/musel/.local/share/cojudge-backups/` with private permissions.

Verification: 253 unit/integration tests passed; the production build passed. The dedicated browser test saved a real editor change, restored in a fresh browser, synchronized bookmarks, and replaced a deleted active file across two open tabs. A separate VPS test confirmed persistent code and completed flags after container restart, rejection of a stale revision, and rejection of a different Origin. Public unauthenticated requests returned 401. The live browser matched server revision 20; a new isolated browser restored the same three file groups and three progress entries without sending a write. Learner activity continues after these observations, so revision counts will increase.

An independent review found two issues: failed conflict actions could hide recovery controls, and stale editor tabs could recreate deleted files. Regression tests reproduced both issues. Conflict controls now remain available after failure. Restores now invalidate old editor contexts and reload tabs; tests cover teardown writes and browser-storage exhaustion. Visual testing also confirmed that the server indicator leaves Submit accessible. The type-check result remains the upstream baseline of 30 errors and 29 warnings.

Rollback: start the retained `cojudge` container, restore `nginx-before-switch.conf` from the backup directory to `/etc/nginx/sites-available/cojudge.musel.dev`, validate with `sudo nginx -t`, and reload nginx. Stop `cojudge-vps` only after traffic has moved. Keep `/data/progress` intact. The old application will use browser storage again and will not synchronize server progress.
