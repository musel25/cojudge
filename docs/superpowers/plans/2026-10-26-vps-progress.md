# VPS Progress Implementation Plan

**Goal:** Automatically save this private installation's code and progress on the VPS and restore it in another browser.

**Architecture:** Keep the existing browser stores. Add an opt-in, same-origin API backed by revisioned JSON snapshots in a persistent private directory. Use optimistic concurrency to prevent stale browsers from replacing newer work. The installation has one shared learner profile behind its existing HTTP authentication.

**Tech Stack:** Existing SvelteKit, TypeScript, Node filesystem APIs, Vitest, Playwright.

**Spec:** User request in this session: save code and progress on the VPS too. Include solutions, file contents, solved flags, bookmarks, custom test cases and game results. Keep browser data offline. Settings, cloud credentials and pasted images are outside this change. Import only into an empty server; restore only into an empty browser or a browser whose saved baseline is unchanged. If both changed, stop automatic writes and offer an explicit choice with both copies retained.

## Global Constraints
- Start from deployed upstream commit e6fb9e5; no unrelated version upgrade.
- API disabled unless directory and public origin are configured.
- Preserve existing authentication, content volume, custom course work and browser data.
- Save serialized writes atomically; preserve previous revisions. Reject cross-origin writes, invalid records and bodies over 4 MiB.
- Show server status separately from the existing local save status.
- No secrets or learner data in Git. Commit each coherent unit and push immediately.

## Review Focus
- Stale or concurrent tabs must not overwrite newer server state.
- A failed or ambiguous write must be safely retryable.
- First load and restore must not erase edits made while a request is pending.
- Empty browsers must restore without erasing the server; empty deliberate edits must still save.
- Restart, invalid data and failed disk writes must not produce a false saved status.

## Task 1: Revisioned server store
- [ ] Write failing tests for persistent restart reads, revision conflict, concurrent writes, invalid data, size limits and origin enforcement.
- [ ] Implement shared snapshot types/validation and a serialized atomic file store.
- [ ] Add GET/PUT /api/server-progress. GET returns {revision, savedAt, data}; PUT accepts {baseRevision, data}; conflicts return 409 with the current snapshot.
- [ ] Run focused tests, then commit and push.

## Task 2: Browser synchronization
- [ ] Write failing tests for migration, fresh-browser restore, offline retry, conflict refusal and edits during requests.
- [ ] Implement a testable sync controller using storage, transport, apply-data and status callbacks. Keep the last acknowledged data/revision in a reserved local key.
- [ ] Integrate automatic save, polling and visibility/pagehide flushing with the existing layout. Add a compact server save status with retry and explicit conflict actions.
- [ ] Run tests and build; commit and push.

## Task 3: Deployment and proof
- [ ] Document deployment, data directory and recovery. Request independent review and resolve material findings.
- [ ] Back up existing server content/config, build a pinned image, test on a loopback port and switch the production container with a rollback path.
- [ ] Verify authentication, browser-to-server save, fresh-browser restore, stale-write rejection and persistence after restart. Import the existing browser state.
- [ ] Record verification and commit/push tracked documentation.
