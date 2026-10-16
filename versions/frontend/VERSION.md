# Frontend version history

## 0.2.0.0 — 2026-10-16

- Keep the six main expense sections and add an optional search below them
  with 90 bundled subcategories, section suggestions and expandable results.
- Search across sections using accent-insensitive terms and keywords such as
  petrol, pharmacy and streaming; selecting a result selects its main section.
- Save the selection when creating or editing expenses and recurring rules,
  carry it to future occurrences and show it in transaction history/search.
- Clear the selection when changing section or switching to income. Keep
  budgets and charts grouped under the six main sections.
- Append migration `0004_expense_subcategories` with nullable transaction and
  recurring-rule fields. Existing SQL, migration dates and protected hashes
  remain intact. Expo version and Android identity are unchanged.

**Threat impact:** Validate subcategory IDs and their parent expense section
  in both form and repository input. Parameterized local writes, integer cents
  and existing destructive confirmations remain in use. The migration only
  adds optional fields and preserves existing financial records.

**Sovereignty impact:** The full catalogue, keywords, search and persistence
  work locally. No dependency, account, network service, telemetry, remote
  compilation or financial-data export is added.

**Validation:** `npm run release:check` passed in the working directory:
  TypeScript, 129 application tests and 23 release-tool tests. The four
  feature-related suites also passed separately (34 tests). After the final
  accessibility adjustment, `npm run typecheck`, `node scripts/check-release.cjs`
  and `git diff --check` passed. Reviewed the SQL and protected the new migration
  with `npm run release:lock-migrations`; checked all previous hashes and schema
  snapshot definitions stayed intact. The scoped secret scan passed after
  excluding verified migration SHA-256 fields from entropy detection.
  Isolated Chrome acceptance with synthetic data passed global/keyword/accent
  search, empty results, parent selection, save/reload/edit, removal and section/
  type changes. Mobile 390 px and desktop 1280 px renders were inspected;
  the form also passed the 320 px horizontal overflow check. Android phone and
  packaged APK acceptance remain pending.

**Status:** `verification-pending` — local source change; Android phone and
  packaged APK acceptance remain pending. No new APK, push, tag or publication.

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
