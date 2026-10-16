# Documentation version history

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
