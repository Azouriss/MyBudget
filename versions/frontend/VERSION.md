# Frontend version history

## 0.1.2.0 — 2026-10-16

- Restore the sage background and pressed styles of native buttons, including
  payday confirmation, by letting React Native resolve their style callbacks.
- Show the saved payday in the settings card and refresh it after changes or
  removal. Distinguish missing settings from a failed read.

**Threat impact:** Presentation and local settings reads only. Financial
  calculations, input validation, persistence, protected migrations, Android
  identity and signing material are unchanged.

**Sovereignty impact:** The existing local SQLite settings remain the only
  source of the payday. No network dependency, account, telemetry,
  synchronization or remote build is added.

**Validation:** `npm run check` passed: TypeScript, 118 application tests and
  23 release-tool tests. `node scripts/check-release.cjs` and `git diff --check`
  passed. Two additional isolated React checks reproduced the native style
  loss and verified button states and payday updates, removal and read errors.
  Browser rendering, Android device and packaged APK acceptance remain pending.

**Status:** `verification-pending` — local source fix; no new APK, push, tag or
  publication.

## 0.1.1.0 — 2026-10-16

- Use MyBudget as the application name in Android/web configuration, headers,
  settings, loading states and database recovery guidance.
- Add the approved dark forest-green wallet-and-leaf branding to the launcher,
  Android adaptive icon, launch screen, application header and web favicon.
- Keep the adaptive foreground inside a circle of radius 28% of its canvas so
  the wallet and leaf fit the launcher's circular mask.

**Threat impact:** Local image assets and display configuration only. No change
  to financial calculations, database identity, protected migrations, Android
  application ID, permissions or signing material.

**Sovereignty impact:** All runtime images are bundled locally. No network
  dependency, account, telemetry, synchronization or remote build is added.
  The logo was created using imagegen from project design references; no
  financial records were supplied.

**Validation:** `npm run check` passed: TypeScript, 118 application tests and
  23 release-tool tests. Release identity/migrations, resolved Expo prebuild
  configuration, PNG dimensions, alpha and adaptive-icon safe bounds passed
  separate checks. The circular icon preview was inspected locally. Android
  device and packaged APK acceptance remain pending.

**Status:** `verification-pending` — local source and asset integration; no new
  APK, push or publication.

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
