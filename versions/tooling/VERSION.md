# Tooling version history

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
