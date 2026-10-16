# Tooling version history

## 0.1.4.0 — 2026-10-16

- Include the separate planning schema in Drizzle generation so migration SQL,
  snapshots and bundled imports include the local planning and portability tables.

**Threat impact:** Schema generation only; existing protected migration hashes
  remain unchanged and generation does not connect to a user database.

**Sovereignty impact:** Local development tooling only; no remote build or service.

**Validation:** `npm run db:generate -- --name=local_planning_tools` generated
  migration 0006; SQL review, SQLite tests and `npm run release:check` passed.

**Status:** `verification-pending` — local tooling validation only.

## 0.1.3.0 — 2026-10-16

- Name the next locally built APK `MyBudget-<version>-<code>.apk` to match the
  approved application name. Keep the existing signing and update procedure.

**Threat impact:** Output filename only; application identity, signing keys,
  versionCode handling and release verification remain unchanged.

**Sovereignty impact:** The existing local compilation path is retained. No
  remote build, additional service or dependency is introduced.

**Validation:** Windows PowerShell parser accepts the updated build script.
  `node scripts/check-release.cjs` verifies identity, versions and migrations;
  release-tool tests run through `npm run check`. No APK build is performed.

**Status:** `verification-pending` — local filename change only.

## 0.1.2.0 — 2026-10-16

- Rename the workflow to 🔎 Tag Version and run it on every push to main.
- Derive the tag from the pushed tip commit's platform and four-part version,
  checking its platform history. Include documentation and tooling commits.
- Retain the three newest version tags across platforms by target commit date;
  delete older matching tags after validating the current tag and cleanup plan.

**Threat impact:** The existing contents-write token now deletes old version
  references as requested. Other tag names are excluded; target changes and
  incomplete metadata stop cleanup. Existing tags are never moved. Repository
  protection may block deletion; commits and releases are never deleted.

**Sovereignty impact:** No new service, secret, build, artifact or cache storage.
  Automation remains on the standard public-repository GitHub runner.

**Validation:** Local tests cover commit/history matching, all platforms,
  retention, reruns, annotations, conflicting targets and cleanup failures.
  Live GitHub execution is not established by local tests.

**Status:** `verification-pending` — no release or APK publication.

## 0.1.1.0 — 2026-10-16

- Automatically create a frontend version tag when its history changes on main,
  with a manual trigger for the current version. Never create releases or APKs.
- Refuse to move existing tags and restrict execution to this public repository.

**Threat impact:** Tag creation uses the temporary GitHub token with contents
  write permission, no personal credential or signing key. The workflow runs only
  on main, fetches the event commit and never updates or deletes existing tags.

**Sovereignty impact:** Tag automation executes on a standard GitHub runner using
  public source. No external build service, paid runner, cache or artifact upload.

**Validation:** Tag parsing, creation, reruns, conflicting targets, annotated tags
  and API failures covered by local unit tests. Live GitHub execution remains
  unverified until installation and a workflow run.

**Status:** `verification-pending` — no release or APK publication.

## 0.1.0.0 — 2026-10-16

Initial tracked tooling baseline, starting the platform history at `0.1.0.0`.

- Include the locked npm environment, TypeScript/Jest configuration, Expo web
  compatibility scripts and domain, migration and release-tool tests.
- Include local Android APK compilation, signature/identity comparison and
  append-only migration integrity controls.
- Exclude local assistant instructions, internal docs, credentials, signing keys,
  personal data, caches and build outputs from Git.

**Threat impact:** Repository exclusions reduce accidental disclosure; they do
  not erase Git history or replace review. Release controls protect application
  identity and migration integrity. Signing material remains outside the commit.

**Sovereignty impact:** Local Windows Android compilation is provided. EAS is
  optional and transfers source to an external build service. Dependency
  installation still requires the configured package sources.

**Validation:** `npm run release:check` passed: TypeScript, 118 application tests
  and 23 release-tool tests. Five scanner findings were reviewed as integrity digests
  (four migration SHA-256 values and the Fontsource archive SHA-512 value).
  Exact staged paths and their contents are checked before signing.

**Status:** `verification-pending` — local checks and commit only; no push,
  deployment, APK build or distribution.
