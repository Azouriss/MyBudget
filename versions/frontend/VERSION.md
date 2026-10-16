# Frontend version history

## 0.1.0.0 — 2026-10-16

Initial tracked application baseline. The four-part Git version starts at
`0.1.0.0`; the Expo application version remains `0.1.0`.

- Add the Android budgeting application, with a separate web development preview.
- Include transactions, monthly budgets, recurring expenses, payday reminders,
  local SQLite persistence and four protected migrations.
- Include the Sauge & Crème interface, bundled fonts and their license notices.
- License original code and design under MIT.

**Threat impact:** Financial records stay in local SQLite storage. Validation,
  migration safeguards and destructive-action confirmations are included. User
  backup/export is not implemented; uninstalling or clearing data removes the
  database. Automated checks do not establish security or device acceptance.

**Sovereignty impact:** No account, application backend, telemetry or remote
  runtime service is introduced. Fonts are bundled. Web and Android data stores
  are separate; optional EAS compilation sends source to Expo.

**Validation:** `npm run release:check` passed: TypeScript, 118 application tests,
  23 release-tool tests, application identity and four migration integrity checks.
  Browser and Android device acceptance are not established by this commit.

**Status:** `verification-pending` — local source baseline; no publication or
  release APK is created by this commit.
