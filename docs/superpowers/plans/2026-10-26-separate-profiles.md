# Separate learner profiles

**Goal:** Let Müsel and Alessa use the same private CoJudge site with separate saved code and progress.

**Design:** Keep nginx HTTP authentication. Give CoJudge its own password file, preserving the current musel login and adding alessa. Forward the authenticated username through a header that nginx overwrites. The backend selects storage from that trusted identity and an explicit allowlist. The browser must also send its expected profile on API requests, so an old tab cannot save under newly changed login credentials.

The existing owner continues using `/data/progress`; Alessa uses `/data/progress/profiles/alessa`. This preserves all existing owner history without a live data migration. Courses and problem definitions stay shared. Browser code/progress and the last acknowledged snapshot are cached separately per profile. A profile change backs up the outgoing browser copy, loads the incoming cache, and reloads all open editor contexts before sync resumes.

**Constraints:** Preserve existing work, authentication and other websites. Never commit passwords, password hashes, learner data or private account notes. The password was explicitly supplied by the user and is stored only in private configuration. No profile picker that bypasses authentication. Basic-auth login changes can use a separate browser/private window.

## Tasks
- [ ] Test profile identity validation, separate repositories and rejection of wrong expected-profile headers.
- [ ] Implement server identity resolution and profile-bound API responses.
- [ ] Test browser migration from the owner cache, switching both ways, stale responses and storage failure.
- [ ] Implement browser profile caches and a visible profile name.
- [ ] Test two authenticated profiles in separate browser contexts and account changes on one browser.
- [ ] Run suite, build and baseline type check. Request independent review and resolve material findings.
- [ ] Create private credentials, build and verify staging with both profiles, then update nginx and the application.
- [ ] Verify live isolation, existing owner data, Alessa's empty initial state, password access and preserved save behavior. Record recovery and push all commits.
