# Documentation version history

## 0.1.3.0 — 2026-10-16

- Document Settings tools in both READMEs, complete JSON backups, replacement
  restore, CSV limits, plaintext exports and device-specific reminder consent.
- Add the resolved Expo document picker and file system modules to third-party
  notices with their MIT licenses. Keep Android APK installation first.

**Threat impact:** Public feature documentation only. Explicitly explain backup
  replacement and plaintext files; no private exports, reports or finances included.

**Sovereignty impact:** Document user-selected file transfers and offline tools;
  no external service or remote asset is introduced.

**Validation:** Reviewed local links, public-file scope and dependency versions
  against the lockfile; `git diff --check` and scoped secret review passed.

**Status:** `verification-pending` — documentation of local source changes;
  no APK publication or phone acceptance claimed.

## 0.1.2.0 — 2026-10-16

- Use MyBudget consistently in both READMEs, banners and illustrated previews.
- Update the illustrated brand mark to the approved dark wallet-and-leaf design.
  Preserve the explicit fictional-data and illustrated-preview labels.

**Threat impact:** Public naming and illustrated artwork only; no personal
  financial records, credentials or internal design documents are included.

**Sovereignty impact:** Documentation assets remain local, self-contained SVGs
  without scripts, remote resources or embedded fonts.

**Validation:** Both READMEs' local links and SVG XML/accessibility metadata are
  checked, along with the diff and public-file exclusions. This does not establish
  browser rendering or Android device acceptance.

**Status:** `verification-pending` — local documentation and artwork only.

## 0.1.1.0 — 2026-10-16

- Add an English README with reciprocal language links, retaining Android APK
  installation guidance. Translate both SVG banners and all three illustrated
  previews, explicitly noting that the app interface remains in French.
- Add English and French security policies with a private reporting address,
  reproduction guidance and links from both READMEs.

**Threat impact:** Direct vulnerability reports to a private contact and ask
  reporters to omit personal financial data and secrets from evidence.

**Sovereignty impact:** Documentation continues to use local SVG assets. The
  reporting address does not introduce an application service or data collection.

**Validation:** Local document and image links, public-file exclusions, language
  navigation and diff whitespace checked. English SVG structure and local rendering
  reviewed. No application code changes.

**Status:** `verification-pending` — documentation only; no runtime or device
  acceptance claimed.

## 0.1.0.0 — 2026-10-16

Initial platform version `0.1.0.0`, following the repository's unversioned README
bootstrap commit.

- Present MyBudget as a phone application distributed as an APK with each release.
- Document Android support, installation, updates and the web development preview.
- Add lightweight SVG banners and explicitly illustrated previews with fictitious
  data, the MIT license and third-party notices.

**Threat impact:** No real financial records appear in the illustrations. Public
  instructions preserve private signing files and warn that backup/export is not
  yet implemented. Device compatibility claims distinguish configuration from
  actual acceptance tests.

**Sovereignty impact:** The README uses local SVG assets without external images,
  scripts or font requests. It explains local storage and links to APK releases.

**Validation:** Local links, SVG structure/rendering and public-file exclusions
  checked. Android API 24 minimum confirmed in the local packaged manifest;
  ARM targets confirmed in the local build script. Exact staged paths and their
  contents are checked before signing.

**Status:** `verification-pending` — local documentation; no release published
  and no new runtime or phone acceptance claimed.
