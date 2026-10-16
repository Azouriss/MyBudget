# Third-party notices

The original MyBudget code, design and README artwork are licensed under MIT
in [LICENSE](LICENSE). This grant does not replace third-party licenses or
copyright notices. The following materials retain their upstream terms.

## Bundled fonts

| Material | Provenance | License and copyright notices |
| :--- | :--- | :--- |
| Inter Regular, Medium, SemiBold, Bold | `@fontsource/inter` 5.2.8, local WOFF-to-TTF conversion | [SIL OFL 1.1 and Inter Project Authors](assets/fonts/LICENSE.txt) |
| Playfair Display Regular, SemiBold | `@expo-google-fonts/playfair-display` 0.4.2, original TTF files | [SIL OFL 1.1 and Playfair Display Project Authors](assets/fonts/PlayfairDisplay-LICENSE.txt) |

Preserve both font license files when distributing these fonts. The Playfair
Display notice declares a Reserved Font Name; modified font versions must follow
the OFL naming conditions. These fonts remain available under the OFL and are
not made exclusive to MyBudget. See [font provenance](assets/fonts/README.md).

## Icons

The application uses `lucide-react-native` 0.544.0. The README preview SVGs also
contain icon geometry copied from that installed package. Lucide uses the ISC
license and includes portions derived from Feather under MIT.

The [complete upstream license and copyright notices](assets/licenses/lucide-LICENSE.txt)
are preserved verbatim, including the Lucide Contributors and Cole Bemis notices.
Keep this file with copies of the SVGs that contain these icon paths.
The botanical logo and sprigs originate from the project's `BrandMark.tsx` and
are included in the project's MIT grant.

## Direct application dependencies

This table records resolved versions and declared license identifiers from
`package-lock.json`. It is not a substitute for the upstream license texts.
Dependencies are obtained through npm rather than vendored in this repository.

| Package | Locked version | Declared license |
| :--- | :--- | :--- |
| `@expo/metro-runtime` | 57.0.17 | MIT |
| `@hookform/resolvers` | 5.9.1 | MIT |
| `drizzle-orm` | 0.44.5 | Apache-2.0 |
| `expo` | 57.0.30 | MIT |
| `expo-constants` | 57.0.22 | MIT |
| `expo-crypto` | 57.0.4 | MIT |
| `expo-font` | 57.0.4 | MIT |
| `expo-linking` | 57.0.13 | MIT |
| `expo-notifications` | 57.0.23 | MIT |
| `expo-router` | 57.0.28 | MIT |
| `expo-splash-screen` | 57.0.10 | MIT |
| `expo-sqlite` | 57.0.4 | MIT |
| `expo-status-bar` | 57.0.1 | MIT |
| `expo-system-ui` | 57.0.4 | MIT |
| `lucide-react-native` | 0.544.0 | ISC |
| `nativewind` | 4.2.7 | MIT |
| `react` | 19.2.3 | MIT |
| `react-dom` | 19.2.3 | MIT |
| `react-hook-form` | 7.90.0 | MIT |
| `react-native` | 0.86.3 | MIT |
| `react-native-reanimated` | 4.5.1 | MIT |
| `react-native-safe-area-context` | 5.7.0 | MIT |
| `react-native-screens` | 4.26.2 | MIT |
| `react-native-svg` | 15.15.4 | MIT |
| `react-native-web` | 0.21.4 | MIT |
| `react-native-worklets` | 0.10.1 | MIT |
| `zod` | 4.6.7 | MIT |
| `zustand` | 5.0.15 | MIT |

Development tools, transitive npm packages and native Android components have
their own terms. Preserve applicable notices when redistributing their code or
binaries. Before distributing an APK, collect notices for the components actually
included in that build; this source inventory is not an exhaustive APK license audit.
Refresh this table and the copied notices when the relevant dependencies change.

## License references

- [MIT license](https://opensource.org/license/mit)
- [Official SIL Open Font License text](https://openfontlicense.org/open-font-license-official-text/)

This notice does not change any third-party license or assert ownership of
third-party material.
