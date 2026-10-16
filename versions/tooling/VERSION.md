# Tooling version history

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
