# Frontend version history

## 0.5.5.0 - 2026-10-20

- Redesign history with separate expense and income cards, prominent Inter
  amounts, directional icons and a dedicated operation-count badge.
- Group operations under readable day headings and use white transaction cards
  with category icons and recurring badges. Remove repeated dates and let long
  labels and large amounts wrap without squeezing the transaction description.
- Preserve month navigation, accent-insensitive search, type filters, editing,
  forecast navigation and the persistent Add expense action in empty results.

**Threat impact:** Presentation only. Integer-cent calculations, validation,
  financial records, protected migrations and Android identity are unchanged.
  Keep accessible transaction descriptions, keyboard focus and 48 dp controls.

**Sovereignty impact:** Existing bundled icons, fonts, components and theme
  tokens are reused. No dependency, account, network service, telemetry, data
  export or remote build is added.

**Validation:** Windows `npm run check` initially passed in the shared directory.
  Final `npm run release:check` passed on a temporary source export containing
  HEAD plus only this UI change: TypeScript, 208 application tests, 23 release-tool
  tests and seven protected migrations. The final shared-directory typecheck
  encountered unrelated concurrent translation edits and an ignored source copy.
  A fresh offline Expo web export and isolated Chrome acceptance passed empty,
  income-only, mixed, filtered-empty, planned and large-amount history at
  320/360/390/768 px. Verified search/reset, expense/income filters, editing,
  recorded/planned recurrence navigation, dashboard rows and visible 48 dp add
  controls, without page overflow or runtime exceptions. Reviewed screenshots
  and summary/row wrapping with simulated 150% web text; native font scaling
  and Android phone acceptance remain separate. Scoped diff and secret checks
  passed. Concurrent profile and translation work is excluded from this commit.

**Status:** `verification-pending` - Android phone and packaged APK acceptance
  remain pending. No APK, push, tag, publication or deployment.

## 0.5.4.0 - 2026-10-20

- Redesign the monthly budget overview with a prominent remaining balance,
  compact spending and limit details, and a distinct overspending state.
- Replace explanatory sentences with short labels for net salary and planned
  expenses. Keep explicit zero limits distinguishable from an unset budget.
- Use Inter for every amount in this card and stack secondary values on narrow
  screens or with enlarged native text. Reuse existing theme tokens and controls.

**Threat impact:** Presentation only. Budget calculations, salary fallback,
  validation, database identity and migrations are unchanged. Preserve accessible
  progress information and the 48 dp budget editing target.

**Sovereignty impact:** No dependency, account, telemetry, remote service or build
  is added. Browser acceptance uses an isolated profile and synthetic data.

**Validation:** Windows `npm run release:check` passed: TypeScript, 208 application
  tests, 23 release-tool tests and seven protected migrations. Final responsive
  styling also passed `npm run typecheck` and a fresh offline Expo web export.
  Isolated Chrome checks passed eight budget states at 320, 390 and 768 px:
  empty, zero without/with spending, normal, exceeded, large amounts, salary
  fallback and planned expenses. Verified Inter amounts, edit/create navigation,
  48 dp edit targets and simulated 150% web text within this card; screenshots
  were reviewed. No card text clipping, page overflow or runtime exceptions in
  the final run. An earlier repeated-reload run encountered a transient database
  lock; final acceptance used in-app navigation where available.
  `git diff --check` and the scoped added-line credential scan passed.

**Status:** `verification-pending` - Android phone and packaged APK acceptance
  remain pending. No APK, push, tag, publication or deployment.

## 0.5.3.0 - 2026-10-20

- Shorten interface copy across all tabs, transaction and budget forms,
  recurring expenses, provisions, reminders and data tools. Remove repeated
  instructions and promotional empty-state text; retain financial context.
- Put detailed help behind accessible, initially collapsed controls in Settings,
  payday, forecasts, provisions, recurring entry, transfers and monthly reviews.
  Keep optional CSV category rules in a collapsed section.
- Preserve net salary labels, zero-budget semantics, forecast qualifications,
  plaintext file warnings, restore notices and destructive confirmations.

**Threat impact:** Presentation only. Calculations, validation, database identity
  and protected migrations are unchanged. Disclosure controls expose their state,
  support keyboard activation and retain 48 dp touch targets and focus indicators.
  Browser acceptance uses an isolated profile and synthetic data only.

**Sovereignty impact:** Existing theme tokens and local components are reused.
  No dependency, account, telemetry, service or remote build is added.

**Validation:** Windows `npm run release:check` passed: TypeScript, 208 application
  tests, 23 release-tool tests and seven protected migrations. Final copy changes
  also passed `npm run typecheck` and a fresh local Expo web export.
  Isolated Chrome acceptance passed 26 views/states at 320, 390 and 768 px,
  including all nine help sections with simulated 150% web text, keyboard
  activation and all five calendar consumers. Verified salary entry/editing,
  payday guards, recurring expenses, provisions, favorites, splits, partial
  reimbursements, period budgets, renewals, JSON backup, CSV export/import
  and confirmed restoration with synthetic data. No page overflow, clipped
  enlarged text in the help sections or runtime exceptions were detected.
  One transient lock during repeated web reloads recovered through the existing
  retry action without resetting the database. Screenshots were reviewed;
  `git diff --check` and the scoped credential/private-path scan passed.

**Status:** `verification-pending` - Android phone and packaged APK acceptance
  remain pending. No APK, push, tag, publication or deployment.

## 0.5.2.0 - 2026-10-20

- Remove the dashboard greeting, motivational quote and repeated local-storage
  footer. Use a direct "Définir un budget" action for the empty dashboard.
- Remove the monthly/category budget explanation footer and the redundant
  promotional card and payday instructions in Settings. Name the screen
  "Paramètres" and display the app version without the internal theme name.
- Retain financial context, salary fallback labels, data-loss notices and
  destructive confirmations. Remove unused presentation styles and imports.

**Threat impact:** Presentation only. Financial calculations, validation,
  database identity and protected migrations are unchanged. Existing accessible
  controls and confirmations are preserved. Browser checks use an isolated
  profile with synthetic transactions; no maintainer finances are accessed.

**Sovereignty impact:** Existing components and theme tokens are reused. No
  dependency, telemetry, network service, account or remote build is added.

**Validation:** Windows `npm run check` passed: TypeScript, 208 application
  tests and 23 release-tool tests. `node scripts/check-release.cjs` passed
  with seven protected migrations. A fresh local Expo web export and isolated
  Chrome checks passed for empty/populated dashboard and budget screens and
  Settings at 320, 390 and 768 px without page overflow or runtime exceptions.
  Verified budget navigation, retained data-loss copy and app version, and
  reviewed screenshots. `git diff --check` and the scoped secret scan passed.
  Android phone and packaged APK acceptance remain pending.

**Status:** `verification-pending` - local source and browser checks only;
  no APK, push, tag, publication or deployment.

## 0.5.1.0 — 2026-10-16

- Arrange category budgets with a separate heading, spending amount and limit
  so long labels and amounts can wrap within the available width. Account for
  screen gutters when stacking the monthly overview on small screens.
- Keep the month selector at full width, allow its label to wrap, and preserve
  the 48 dp icon buttons without shrinking. Let Pressable resolve pressed and
  focus styles for the selector, icon buttons and category budget rows.

**Threat impact:** Presentation only. Budget calculations, salary defaults,
  input validation, database identity and migrations are unchanged. Accessible
  labels, focus indicators, disabled states and existing navigation actions
  are preserved. No financial data is read or exported by this commit task.

**Sovereignty impact:** Existing local components and theme tokens are reused.
  No dependency, account, telemetry, network service, synchronization, export
  or remote build is introduced.

**Validation:** Windows `npm run check` passed: TypeScript, 208 application
  tests and 23 release-tool tests. `node scripts/check-release.cjs` passed
  with seven protected migrations. Reviewed the three source diffs and
  48 dp theme values; `git diff --check` and the scoped secret scan passed.
  Browser rendering, Android phone and packaged APK acceptance are pending
  for this commit; automated tests do not establish those results.

**Status:** `verification-pending` — local source checks only; no APK,
  push, tag, publication or deployment.

## 0.5.0.0 — 2026-10-16

- Add complete versioned JSON backup and atomic restore through the system file
  picker, plus CSV transaction export. Reject unknown schemas, invalid records,
  broken references and oversized UTF-8 files; restore with reminders disabled.
- Add editable entry favorites, explicit pay-to-pay budget periods, partial
  reimbursement tracking, and category allocations that preserve payment totals.
- Add CSV column mapping, previews, local category rules, explicit row selection
  and duplicate review. Scope exact reimport identities to the source file;
  matching payments from other files require review. Escape spreadsheet formulas.
- Add monthly comparisons with category contributions and source transactions,
  and renewal/cancellation dates with optional private local Android reminders.
- Expose these tools in Settings, preserve existing monthly budgets and forecasts,
  and add migration 0006 with its generated snapshot, journal and protected hash.

**Threat impact:** New file ingestion is bounded and strictly validated. Restore
  and CSV batches commit atomically; the existing database and migration ledger
  are preserved. Destructive actions require confirmation, unsaved forms are
  guarded, and linked payments cannot silently invalidate splits or reimbursements.
  Exported files contain financial data in plaintext and are explicitly labeled.
  Secret scanning found only the seven expected migration SHA-256 values, verified
  by release checks. No maintainer finances were read or exported.

**Sovereignty impact:** All calculations, rules, parsing and reminders run locally.
  File selection and saving use the system picker and Expo modules compatible with
  SDK 57. No bank connection, account, telemetry, remote build or service is added.
  Export destinations are chosen by the user; backups are not uploaded by the app.

**Validation:** Windows `npm run release:check` passed in the shared workspace:
  TypeScript, 208 application tests and 23 release-tool tests. The 28 new cases
  cover restore/rollback, references, reimport identities, split totals, partial
  reimbursements, cycle boundaries, CSV parsing, UTF-8 limits and reminder dates.
  Migration 0006 was reviewed, tested and locked with `npm run
  release:lock-migrations`; previous protected entries were preserved.
  Local Expo web export and isolated Chrome acceptance passed favorites, splitting,
  reimbursements, period budgets, renewal records, JSON download, CSV import and
  restore after import. All seven new routes plus Settings were checked at 320
  and 390 px without page overflow or runtime exceptions; screenshots were reviewed.
  The final UTF-8 size-bound adjustment was verified by unit tests.
  `npx expo export --platform android --output-dir
  docs/planning-review/android-bundle` also produced the Android Hermes bundle;
  this does not constitute an APK build or device acceptance.

**Status:** `verification-pending` — local source and web checks. Android device
  file selection, notification delivery, signed APK and update acceptance remain
  pending. No APK, push, tag, publication or deployment.

## 0.4.1.0 — 2026-10-16

- Use the net salary recorded for the selected month as the default global
  budget when no explicit monthly limit exists. Identify the salary default
  on the dashboard and budget overview, including spending progress and
  remaining amounts. Explicit limits, including zero, take precedence.
- Prefill the global budget editor from the salary without treating it as a
  saved limit. Removing an explicit limit restores the salary default; salary
  edits, moves and deletions update that default. Category limits stay intact.
- Label salary amount inputs `Salaire NET en euros` in both the payday and
  general income forms, with a reminder to enter the amount actually received.

**Threat impact:** The fallback is derived through the existing local salary
  query without creating a budget or modifying transactions. Integer cents,
  Zod validation, civil months, parameterized queries, destructive confirmations
  and explicit zero budgets remain in use. This change requires no migration
  or change to database identity, Android identity or signing material. All
  acceptance data is synthetic.

**Sovereignty impact:** Existing bundled code and local SQLite storage are
  reused. No dependency, account, telemetry, network service, synchronization,
  financial-data export or remote build is introduced.

**Validation:** `npm run check` passed through Windows npm in the shared
  working directory: TypeScript, 179 application tests and 23 release-tool
  tests. Five new SQLite regression cases exercise the salary fallback,
  read-only behavior, envelope warnings, month/income isolation, explicit
  zero limits, and salary corrections, moves and deletion. The same check
  passed on an isolated source snapshot excluding concurrent changes:
  TypeScript, 154 application tests and 23 release-tool tests.
  `node scripts/check-release.cjs`, `git diff --check` and the scoped
  `detect-secrets scan --no-verify --all-files` scan passed. Web acceptance
  remains unverified: a new Metro server failed to start file watching and
  the existing server served an earlier bundle without the updated labels.

**Status:** `verification-pending` — local source checks only. Web, Android
  phone and packaged APK acceptance remain pending; no APK, push, tag or
  publication.

## 0.4.0.0 — 2026-10-16

- Add the Prévoir tab with a current-month margin after recorded expenses
  and known recurring charges, a transparent breakdown, category overrun
  notices and an optional purchase/precaution simulation without writes.
- Add a 7/30-day expense agenda with monthly subtotals, recorded/planned
  labels and links to the original expense or recurrence. Keep monthly
  limits separate from rolling date ranges and bank balances.
- Add local provision goals with a target, due date, monthly contribution
  day and an append-only reserve movement history. Validate additions and
  releases against the goal balance and confirm releases/deletion. Reserves
  do not create transactions or automatically reduce the monthly margin.
- Add and protect migration `0005_provision_goals`, its schema snapshot,
  journal and bundled import. Preserve prior migration SQL and hashes.

**Threat impact:** Forecast reads respect recurrence cursors, stopped rules
  and original occurrence identities, including dates moved outside the
  selected month. Block optimistic totals while due expenses need catch-up.
  Provisions use Zod, integer cents, civil dates, parameterized statements
  and transactional balance checks. The additive migration preserves existing
  records and the app/database identities. Synthetic fixtures only were used.

**Sovereignty impact:** All four features run locally with existing bundled
  libraries. This change adds no dependency, account, telemetry, network
  service, financial-data export, synchronization or remote build.

**Validation:** `npm run release:check` passed through Windows npm in the
  shared working directory: TypeScript, 179 application tests and 23 release
  tool tests. New cases exercise projection immutability, catch-up gating,
  deduplication, stopped/deleted occurrences, calendar boundaries, reserve
  balance checks and provision persistence. Migration tests also verify
  reopening, rollback and preservation of provision records. Reviewed the
  SQL and ran `npm run release:lock-migrations`; previous snapshot table
  definitions and protected migration hashes are unchanged.
  Isolated Chromium acceptance with synthetic data passed empty-state setup,
  recorded/recurring charges, purchase and precaution simulations, invalid
  input, agenda navigation, provision creation, reserve additions/releases,
  rejection of excess reserves, reload persistence and deletion confirmations.
  Inspected renders; the agenda and five-tab navigation passed overflow and
  48 px control checks at 320/390/1100 px, with no runtime exceptions.
  `git diff --check` passed. The scoped secret scan reported only the six
  reviewed migration SHA-256 fields in `release-policy.json`.

**Status:** `verification-pending` — local source checks completed. Android
  phone and packaged APK acceptance remain pending; no APK, push, tag or
  publication is included.


## 0.3.1.0 — 2026-10-16

- Show active recurring expense forecasts when viewing future months in the
  dashboard, history and budgets. Keep current and past months based on
  recorded transactions, and identify totals that include forecasts.
- Mark recorded recurring expenses with a repeat icon and label. Add
  `Récurrente · Prévue` to forecasts and open their recurrence settings when
  selected; recorded occurrences keep their individual editing flow.
- Compute forecasts without writing transactions or advancing recurrence
  cursors. Respect stops, edits, deleted or moved recorded occurrences,
  weekly/yearly rules, leap days and the original end-of-month anchor.

**Threat impact:** Forecasts only read the local database. Existing integer
  cents, civil dates, parameterized queries, validation and due-occurrence
  materialization remain in use. Database identity, migrations, Android
  identity and signing material are unchanged. Synthetic test data only
  was used for acceptance; no maintainer finances were read or exported.

**Sovereignty impact:** Scheduling, icons and forecasts reuse bundled code
  and dependencies. No account, telemetry, network service, synchronization,
  financial-data export, new dependency or remote build is introduced.

**Validation:** `npm run check` passed in the shared working directory:
  TypeScript, 149 application tests and 23 release-tool tests. Fifteen added
  regression cases cover future forecasts, calendar boundaries, read-only
  behavior, deduplication, edits, stops and preserved recorded expenses.
  `node scripts/check-release.cjs`, `git diff --check` and the scoped
  `detect-secrets scan --no-verify --all-files` scan passed. Isolated Chrome
  acceptance using synthetic storage passed the actual recurring badge,
  future dashboard/history, 320/360/390 px layouts, filters/search, forecast
  navigation, amount changes and stopping without altering recorded history.
  Screens were inspected; no page overflow or runtime exceptions were seen.
  Android phone and packaged APK acceptance remain pending.

**Status:** `verification-pending` — local source and web verification only;
  no new APK, push, tag or publication.

## 0.3.0.0 — 2026-10-16

- Open a French calendar when tapping the transaction date, with Monday-first
  weeks, previous/next month navigation, the current selection and Today.
- Keep explicit keyboard entry in `DD/MM/YYYY`, including existing validation.
  Opening or cancelling the calendar preserves typed input; choosing a day
  updates the same date field used by expense creation and editing.
- Keep day and month-navigation targets at least 48 dp. Small screens can
  scroll the calendar horizontally and the dialog vertically.
- Hide subcategory suggestions and result counts when the search is empty,
  including after choosing a main section or subcategory. Keep the selected
  subcategory visible and allow another search at any time.

**Threat impact:** Local form presentation only. Existing civil-date range
  checks, Zod validation, integer cents, confirmations, database schema and
  Android identity remain unchanged. Calendar arithmetic uses UTC to avoid
  daylight-saving or time-zone shifts when generating civil dates.

**Sovereignty impact:** Calendar, formatting and search reuse bundled code
  and libraries. No dependency, network service, account, telemetry, data
  export or remote build is introduced.

**Validation:** `npm run check` passed in the working directory: TypeScript,
  149 application tests (including five calendar cases) and 23 release-tool
  tests. After the final presentation adjustment, `npm run typecheck`,
  `node scripts/check-release.cjs`, `git diff --check` and the scoped
  `detect-secrets-hook --no-verify --json` scan passed. Isolated Chrome
  acceptance with synthetic data passed calendar selection, month/year
  navigation, cancellation, keyboard validation, leap day, Today,
  save/reload/edit and hiding results after category selection. Renders at
  320, 390 and 1280 px were inspected; day targets meet 48 dp, with no page
  overflow at 320 px. Native Android phone and packaged APK acceptance
  remain pending.

**Status:** `verification-pending` — local source change. Android phone and
  packaged APK acceptance remain pending; no APK, push, tag or publication.

## 0.2.2.0 — 2026-10-16

- Restore native transaction filter styles and equal-width touch targets by
  letting Pressable resolve its state styles without NativeWind flattening.
- Keep large-font filters stacked with natural heights and rounded corners.
- Keep an explicit Add expense button in the history screen footer, above
  the tabs, including empty months, filters and searches. The list scrolls
  independently; loading and read errors retain their existing safeguards.

**Threat impact:** Presentation, filtering controls and navigation only.
  Financial calculations, input validation, database identity, migrations,
  Android identity and signing material are unchanged by this correction.

**Sovereignty impact:** Existing local UI and navigation are reused. No new
  dependency, network service, account, telemetry, financial-data export or
  remote compilation is introduced.

**Validation:** `npm run check` passed in the working directory: TypeScript,
  129 application tests and 23 release-tool tests. `node scripts/check-release.cjs`
  and `git diff --check` passed. Eight isolated native React checks passed via
  `node node_modules/jest/bin/jest.js --config /tmp/mybudget-history-review/jest.config.cjs --runInBand --silent`,
  reproducing the style loss and checking filter states, large fonts, empty
  lists, searches, add navigation and loading/error states. Isolated Chrome
  checks at 320, 360 and 390 px passed touch-target and overflow checks,
  empty-filter add availability and opening the expense form, with zero
  runtime exceptions. Screens were inspected using synthetic empty storage.
  The scoped detect-secrets scan passed. Android phone and APK acceptance
  remain pending.

**Status:** `verification-pending` — local source correction; no new APK,
  push, tag or publication.

## 0.2.1.0 — 2026-10-16

- Centralize result messages in `NoticePopup`, displayed at the top safe area
  away from form submission buttons, including payday, budget and transaction saves.
- Dismiss messages after three seconds by default and show a shrinking countdown
  arc around the close button. Retain manual dismissal and 48 dp touch targets.
- Restart the lifetime for repeated messages and prevent old expiry callbacks
  from closing newer messages. Respect Android accessibility timeouts and
  reduced motion, with a working fallback if accessibility APIs fail.

**Threat impact:** Presentation and temporary UI state only. Existing explicit
  destructive confirmations, financial calculations, database schema and
  migration safeguards are unchanged by this change.

**Sovereignty impact:** The popup and countdown use existing bundled libraries.
  No dependency, network request, telemetry, account, synchronization or remote
  build is added.

**Validation:** `npm run release:check` passed in the shared working directory:
  TypeScript, 129 application tests including three notice replacement regressions,
  and 23 release-tool tests. Six isolated `jest-expo/android` checks passed for
  timing, safe-area placement, manual closure and accessibility; native views are
  mocked. Nine isolated Chrome cases passed actual payday saving, animated SVG
  countdown, dismissal, repetition, reduced motion and 320/360/412 px layouts with
  normal and doubled text. No JavaScript console errors were observed. Android
  phone acceptance remains pending.

**Status:** `verification-pending` — source and web verified locally; no push,
  tag or publication. Device acceptance remains separate.

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
