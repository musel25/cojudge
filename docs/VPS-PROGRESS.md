# Private VPS progress storage

This fork adds optional server persistence behind an authenticated reverse proxy. Without profile configuration, everyone shares one progress store. The private deployment supports separate authenticated learner profiles as described below.

Set these runtime variables on the existing Node application:

```
COJUDGE_SERVER_PROGRESS_DIR=/data/progress
COJUDGE_SERVER_PROGRESS_ORIGIN=https://cojudge.musel.dev
BODY_SIZE_LIMIT=5M
```

The directory must be a persistent, private volume. Keep the application port on loopback and retain the existing nginx HTTP authentication. The API is disabled unless both progress variables are set. PUT requires the configured browser Origin, JSON content and the explicit sync header. Run one application process against this directory; its write queue is in-process.

## Saved data

Code solutions, workspace files (including dotfiles), completed-problem flags, bookmarks, custom tests and game results are included. Browser settings, Firebase credentials, whiteboard drawings and pasted images are not included. Existing browser export remains available for those items.

Browser storage remains the offline copy. The first visit imports into an empty server. A fresh browser restores before the editor opens. Saves start after a 500 ms debounce; a three-second poll catches other changes and checks for server updates. Saves run in the background without a routine status panel. Allow time for the save before closing the browser. Closing a browser before acknowledgement can leave the final edit only in that browser; reopening retries it.

Restoring server data reloads open tabs. An origin-wide restore marker stops old editors and page teardown from writing stale tabs back into the new snapshot.

Server errors and conflicts show recovery controls. Network or disk errors never show a successful server save. If both browser and server changed, writes stop for review. **Save this browser copy** uses a revision check and keeps the previous server revision. **Use server copy** first stores the displaced browser data under `cojudge-vps-conflict-<timestamp>` in browser local storage. That key is intentionally excluded from ordinary exports; recover it directly if needed.

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

## Initial deployment record — October 26, 2026

This single-profile deployment was replaced by the profile deployment recorded below.

- Running application: `cojudge-vps`, image `cojudge:vps-cef3d5cba8844d4e7f9f93c14133c8d5b23f840a`.
- nginx keeps the original HTTPS and HTTP authentication. It forwards to loopback port 5378.
- Existing content volume `cojudge-trial-data` remains mounted at `/data`. Progress is under `/data/progress`; existing courses remain in their original directories.
- The original `cojudge` container is stopped and retained for rollback. The isolated verification container and volume were removed.
- Pre-deployment configuration and content backup: `/home/ubuntu/cojudge-backups/pre-vps-sync.ILTC5V/`. The runtime environment backup is private. No credentials or learner data are in this repository.
- Browser and post-deployment progress backups are also kept locally under `/home/musel/.local/share/cojudge-backups/` with private permissions.

Verification: 253 unit/integration tests passed; the production build passed. The dedicated browser test saved a real editor change, restored in a fresh browser, synchronized bookmarks, and replaced a deleted active file across two open tabs. A separate VPS test confirmed persistent code and completed flags after container restart, rejection of a stale revision, and rejection of a different Origin. Public unauthenticated requests returned 401. The live browser matched server revision 20; a new isolated browser restored the same three file groups and three progress entries without sending a write. Learner activity continues after these observations, so revision counts will increase.

An independent review found two issues: failed conflict actions could hide recovery controls, and stale editor tabs could recreate deleted files. Regression tests reproduced both issues. Conflict controls now remain available after failure. Restores now invalidate old editor contexts and reload tabs; tests cover teardown writes and browser-storage exhaustion. Visual testing also confirmed that the server indicator leaves Submit accessible. The type-check result remains the upstream baseline of 30 errors and 29 warnings.

Rollback: start the retained `cojudge` container, restore `nginx-before-switch.conf` from the backup directory to `/etc/nginx/sites-available/cojudge.musel.dev`, validate with `sudo nginx -t`, and reload nginx. Stop `cojudge-vps` only after traffic has moved. Keep `/data/progress` intact. The old application will use browser storage again and will not synchronize server progress.

## Separate profiles

Enable profile isolation with:

```
COJUDGE_SERVER_PROGRESS_OWNER=musel
COJUDGE_SERVER_PROGRESS_USERS=musel,alessa
```

nginx must authenticate users with a CoJudge-specific password file and overwrite the identity header:

```
auth_basic_user_file /etc/nginx/.htpasswd-cojudge;
proxy_set_header X-CoJudge-User $remote_user;
```

Keep the application port bound to loopback. The identity header is trusted only because the reverse proxy overwrites it. Do not expose this port directly or accept identity from a client-controlled header through another proxy. Both profile variables must be valid; incomplete configuration fails closed.

The `musel` account keeps the existing `/data/progress/current.json` and history. The `alessa` account uses `/data/progress/profiles/alessa/`. Existing owner work requires no copy or move. Courses and problem definitions remain shared. Credentials are held only in private configuration; they are not application source files.

The API requires an expected-profile header and checks it against the authenticated username. The response identifies its profile too. A browser whose login changes must reload before saving. Each profile has its own browser cache for code/progress and sync state. Switching accounts saves the outgoing offline copy before changing the active cache; failure to save that copy stops the switch. Use a separate browser profile or private window when two people use the same computer at the same time. HTTP Basic authentication does not provide an in-app account picker or logout button.

These profiles cover solutions, files, solved flags, bookmarks, custom tests and game results. Browser preferences, images and whiteboards remain outside server synchronization. Old browser caches are private to that browser installation, not encrypted against someone who can inspect that same browser profile.

Profile changes and synchronization share an origin-wide browser lock. A waiting tab reads the active profile again after it acquires the lock. This prevents simultaneous tabs from replacing the outgoing offline cache with another profile's data. The browser must support Web Locks in a secure context. The browser regression test holds this lock in one tab and confirms that another tab cannot switch profiles until release.

## Profile deployment record — October 26, 2026

- Running application: `cojudge-profiles`, image `cojudge:profiles-af6d9fa9ec3ef29e087caa4f5192bfd972f2c2fa`, loopback port 5379.
- nginx uses `/etc/nginx/.htpasswd-cojudge` and overwrites `X-CoJudge-User` with `$remote_user`. The password file has mode 0640 and owner `root:www-data`. The existing owner password hash is unchanged. The separate password file used by the other website is unchanged.
- The same `cojudge-trial-data` volume remains mounted at `/data`. The prior `cojudge-vps` writer was stopped before nginx sent traffic to the new application. Both previous application containers remain available for rollback.
- Private cutover backups are in `/home/ubuntu/cojudge-backups/pre-profiles.dEZH2J/`. They include the prior runtime environment, `nginx-at-cutover.conf`, and `progress-at-cutover.tar.gz`. Local private backups include the browser copy before the switch and the VPS progress directory after the switch.
- The isolated VPS verification container and its test-only volume were removed.

Verification: 261 unit/integration tests and three browser tests passed. The production build passed. The type check remains at the upstream baseline of 30 errors and 29 warnings. Browser tests cover separate profiles, rejected cross-profile requests, offline work when switching both ways, and a tab waiting for another tab's profile lock. Independent review found no remaining blocking issue after the lock change. Its original cache race was demonstrated by a controlled storage-helper interleaving, not by the reviewer's initial browser attempt.

The isolated VPS test saved different data for both profiles, restarted the container, and confirmed that both stores persisted independently. Live checks verified Alessa's supplied password, rejection of an invalid password, and rejection of forged-identity reads and writes through nginx. A fresh browser showed **Alessa** and **Saved to VPS**, with all six progress collections empty at revision 1. The existing owner's browser showed **Müsel** and **Saved to VPS**; its data matched server revision 22, including four file groups, four custom-test collections and three progress entries. These are observations at deployment time; later learner activity changes the counts.

To roll back to the prior server-save deployment, stop `cojudge-profiles`, start the retained `cojudge-vps` container, and restore `nginx-at-cutover.conf` from the profile backup directory to `/etc/nginx/sites-available/cojudge.musel.dev`. Validate with `sudo nginx -t` and reload nginx. Restore the complete nginx configuration, including its original owner-only password file; never enable Alessa's login against the old shared store. Keep the full `/data/progress` directory, including Alessa's subdirectory, intact for recovery. The prior application continues saving the owner's progress only.

## Hidden courses — October 27, 2026

- A course with `"hidden": true` in its `courseinfo.json` is left out of the home-page tabs. Its content stays on disk.
- Running application: `cojudge-profiles`, image `cojudge:profiles-cbccbd08d4fe6b28ce2aa6239ff2fd750026e592`, same port, volume, and environment as before. The previous container is kept, stopped, as `cojudge-profiles-af6d9fa` for rollback.
- The flag is set in the volume copies of `leetcode-1000`, `nc150`, and `nc250`. Backups of the original files are in `/home/ubuntu/cojudge-backups/hide-courses-20261027T224535/`. Remove the flag (or restore a backup) to show a course again; no restart is needed.
- The new `python-oop` course (22 exercises) comes from `capital-one-prep/cojudge/oop`; see its README.

## Course picker and accepted animation — October 27, 2026

- Running application: `cojudge-profiles`, image `cojudge:profiles-1bcab72d0f669737fd1b766a6e7b6ad93f4e3071`. The previous container is kept, stopped, as `cojudge-profiles-cbccbd0` for rollback.
- The home page has a **Lists** menu. Each viewer chooses the visible course tabs; the choice is stored in the browser (`course-visibility`). `"hidden": true` in `courseinfo.json` is now only the default.
- An accepted submission plays a short green check animation (`AcceptedCelebration.svelte`). It closes after about 2 seconds, on click, or on Escape, and respects reduced motion.
- A problem opens in a language that has starter code, so Python-only courses no longer open an empty Java editor in a new browser.

## Software Engineering Tickets and Pybites checks — October 28, 2026

- Published **Software Engineering Tickets** at `/?course=software-engineering`: 24 short Python tickets covering data, APIs, reliability, state, SQL, CSV, UTC, permissions, paths, versions, dependencies, synchronization, and HTML escaping.
- Removed the live `capital-one-codebase-practice`, `capital-one-engineering-50`, and `python-oop` course indexes. Their problem files and saved learner work remain available. Other course indexes are unchanged by this publication.
- Updated all 22 `pybites-oop` problems with input contracts and additional boundary tests. The User bite guarantees nonempty ASCII names. The Ninja Rankings reference now prevents reused people and self-pairs.
- Older Pybites editor tabs keep their old embedded tests. Use **+** to open the current template, then copy the learner implementation into that tab. The old saved tab remains intact.
- Authoring lives in `capital-one-prep/cojudge/production` and `capital-one-prep/cojudge/pybites`. Relevant commits are `355370d`, `ec5695a`, `a8035ea`, and `b119851`. See `cojudge/production/verification.md` in that repository for the detailed record.

Verification: all 380 new-ticket cases and all 390 Pybites cases pass the live judge. All 103 prepared faulty ticket implementations are rejected. Local Pybites verification also rejects 83 prepared faults. Python and independent Java ticket references match all manual expectations; Python 3.11 runs every supplied adapter. An isolated copy of this task passes 86 repository tests. CLI checks accept a correct example solution and reject an incorrect one. Browser and catalog checks confirm the new list and updated content. Learner progress was not written by these checks.

The application image is unchanged: `cojudge:profiles-1bcab72d0f669737fd1b766a6e7b6ad93f4e3071`. Content updates need no application restart.

Rollback files are outside the served volume under `/home/ubuntu/cojudge-backups/software-tickets.PJshjq/`. `content-before.tar.gz` contains the prior Pybites content and affected course indexes. `retired-courses/` holds the three removed course directories. To reverse this replacement, move the new `software-engineering` index out of the served courses directory, restore the three old indexes, and restore prior Pybites definitions if required. Keep all progress data in place.

## Pybites FastAPI course — October 28, 2026

All 10 FastAPI exercises are published at `/?course=pybites-fastapi`. Content,
import provenance, documented adaptations, locked dependencies, references, and
verification tools live in `capital-one-prep/cojudge/fastapi_path` (commits
`39adadb` and `f9ff81f`). The course uses real FastAPI, Pydantic, pytest, and JWT libraries.

The application remains `cojudge:typer-b58c197`. Its environment now sets
`COJUDGE_PYTHON_IMAGE=cojudge-python:fastapi-20261028`. Commit `8b49b46` supplies
this setting for the judge, playground, and debugger. The runtime includes
SQLModel to preserve the existing SQLModel course. Packages and `/usr/bin/time`
are installed at image build time. The runtime image ID is
`sha256:c2a1e4e43f2d24fe34ab7912e54364c30c0c270e544d787956ca1bc2e427d966`.

Verification: 59 isolated live tests pass; all starters are rejected; 12 prepared
faults are detected locally. The Python repository suite passes 146 tests. The
image setting passes 264 Cojudge unit tests and the production build. Production
checks pass both hello-world cases, token creation, an authenticated create, and
rejection of an ownership transfer. The browser shows the new course with 0 / 10
progress. These API checks do not change learner code or completion flags.

Parallel judge instances can remove other sessions' pooled execution containers.
The final isolated JWT check used fresh containers after each completed request.
The temporary FastAPI judge was removed after verification.

Private backup: `/home/ubuntu/cojudge-backups/fastapi-20261028.y1dFbs/`. The prior
application is retained, stopped, as `cojudge-profiles-pre-fastapi-20261028T123728`.
To restore its runtime configuration, stop and rename the current application,
then rename and start that retained container as `cojudge-profiles`. Keep the
content volume and progress data. To hide the course, move only its course index
out of the served courses directory. The startup health request must include
`X-CoJudge-User: musel`; the public reverse proxy adds that identity header.

## Course tab overflow and save panel — October 28, 2026

The application now runs `cojudge:ui-307af20`. This image replaces the application
build in `cojudge:typer-b58c197`. It keeps the existing runtime environment,
Python image, data volume, Docker socket, and loopback port 5379.

Course tabs now scroll within their row. Long names stay on one line and do not
cover the Lists button. The routine VPS save panel, profile name, description,
and timestamp are removed. Automatic saves continue. Errors and conflicts still
show recovery controls. The editor uses the space previously reserved for the
panel.

Verification: 267 unit tests pass. The production build and all three server-save
browser tests pass. Browser checks cover 1280, 768, and 390 pixel widths. An
isolated VPS container passed before deployment. Live checks with all lists
enabled confirm scrolling and access to the Lists button at desktop and phone
widths. These live checks made no learner-data writes. The type check retains
the documented baseline of 30 errors and 29 warnings. Code review found no issues.

Private backup: `/home/ubuntu/cojudge-backups/ui-307af20/`. It contains the prior
container configuration and a progress backup. The prior container is retained,
stopped, as `cojudge-profiles-pre-ui-307af20`. To roll back, stop and rename the
current container. Rename the retained container to `cojudge-profiles` and start
it. Keep the current data volume and progress data.

## Python learning path — October 28, 2026

The application now runs `cojudge:learning-path-e66bce7`. The image replaces the
application build in `cojudge:ui-307af20`. It preserves the runtime environment,
Python image, data volume, Docker socket, restart policy, and loopback port 5379.

The home page has a **Learning path** button beside **Lists**. The panel groups
nine steps into Foundation and Build, in the approved course order. Each
available course shows saved exercise progress. **Continue** opens the first
available unfinished course. Opening a hidden course makes it visible in the
course navigation. Decorators and Context Managers remains visible as
**Not available** until its course is added.

Verification: the clean release from commit `e66bce7` passes 271 unit tests,
three learning-path browser tests, and the production build. An isolated VPS
container passes with a copy of the live course content. Live browser checks
confirm both phases, eight available course links, 111 exercises, and the saved
completion flags. The 390-pixel layout has no horizontal overflow. The browser
checks block progress writes and recorded no write attempts. The type check
retains the baseline of 30 errors and 29 warnings.

Private backup: `/home/ubuntu/cojudge-backups/learning-path-e66bce7.qSVu9f/`.
It contains the prior container configuration, runtime environment, and progress
backup. The prior container is retained, stopped, as
`cojudge-profiles-pre-learning-path-20261028T130540`. To roll back, stop and rename
the current container. Rename the retained container to `cojudge-profiles` and
start it. Keep the current data volume and progress data.
