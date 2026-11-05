# Rectangles

An educational phone game from the IDEMS game studio, based on
*Rectangles* (also known as Shikaku) from
[Simon Tatham's Portable Puzzle Collection](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/).

Divide the grid into rectangles so that each contains exactly one number,
and that number is its area.

- Drag from cell to cell to draw a rectangle (its size is shown while
  drawing); tap a rectangle to remove it.
- Sizes 4×4 to 10×10, or a custom size up to 25×25.
- An interactive tutorial on first launch (and from the **?** button).
- Puzzles are generated on the device; the generator is an exact port of
  the original, so a game ID such as `7x7#123456789012345` gives the same
  puzzle as the original collection.

Built with Angular and Capacitor, for Android and iOS.

## Getting started

The shared engine and shell come from the
[games-common-core](https://github.com/IDEMSInternational/games-common-core)
**submodule**, so clone with:

```sh
git clone --recurse-submodules https://github.com/IDEMSInternational/rectangles.git
cd rectangles
npm install
```

(If you already cloned without it: `git submodule update --init`.)
Run `npm install` here only, never inside `games-common-core`.

```sh
npm start              # dev server at http://localhost:4200
npm test               # unit tests, including 680 puzzles checked against the original
npm run build          # production web build
npm run apk            # Android debug APK -> Rectangles.apk
```

`npm run apk` needs JDK 21 (`JAVA_HOME`) and the Android SDK (`ANDROID_HOME`,
or `android/local.properties` with `sdk.dir=...`).

The iOS app needs a Mac with Xcode (or a macOS GitHub Actions runner). The
web build isn't committed in `ios/`, so build it and copy it in first, then
open or build `ios/App/App.xcodeproj` (scheme `App`; Swift Package Manager,
no CocoaPods):

```sh
npm ci
npm run build
npx cap sync ios
```

To use a newer version of the shared code:

```sh
git submodule update --remote games-common-core
npm test -- --watch=false
git commit -am "Update games-common-core"
```

## Releasing

The version lives in `package.json` only, as major.minor.patch (patch for
fixes, minor for new features, major for big changes). The menu shows it, and
the Android build reads it: `versionName` is the same text, and `versionCode`
(which must go up with every store upload) is major × 1,000,000 + minor × 1,000
+ patch, so 1.2.3 is 1002003. `npm version` also writes the same two numbers
into the iOS project (`MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`, via
`tools/ios-version.mjs`). Each game has its own version.

To release, bump the version (this commits and tags it, e.g. `v1.0.1`), push
with the tag, then build:

```sh
npm version patch      # or minor / major
git push --follow-tags
```

For iOS, then run **iOS - Release** from the repository's Actions tab: it
builds the app and uploads it to TestFlight. As on Google Play, each upload
needs a new version.

While in beta the version stays below 1.0.0 (0.1.0, 0.2.0, ...); 1.0.0 is the
first full public release. For the first release, tag the current version
instead: `git tag v0.1.0`.

### iOS release setup

The **iOS - Release** workflow (`.github/workflows/ios-release.yml`, which runs
`ios/App/fastlane/Fastfile`) signs the app as the open-app-builder apps do:
[fastlane match](https://docs.fastlane.tools/actions/match/), with the
certificate and profiles kept encrypted in a Google Cloud Storage bucket. The
open-app-builder
[iOS release guide](https://github.com/IDEMSInternational/open-app-builder-actions/blob/main/.github/workflows/ios-release.md)
explains the bucket, the service account and the App Store Connect API key.
Once per app:

1. In the IDEMS Apple Developer account, register the App ID
   `international.idems.games.rectangles` (no extra capabilities). Then create
   the app in App Store Connect with that bundle ID, and add an internal
   TestFlight group.
2. The workflow needs the variables and secrets below. The three variables are
   IDEMS organisation variables, already shared with this repository; they
   point at the bucket that holds the IDEMS distribution certificate. The
   secrets must match them, above all the bucket's encryption password: given
   a bucket it can't read, match would try to create a new certificate, and
   Apple allows only a few. Add them in the repository's or the organisation's
   Actions settings.

   | Type     | Name                                | Value                                    |
   | -------- | ----------------------------------- | ---------------------------------------- |
   | Variable | `APP_STORE_TEAM_ID`                 | Apple Developer Team ID                  |
   | Variable | `GCP_IOS_CERTS_PROJECT_ID`          | Google Cloud project holding the bucket  |
   | Variable | `GCP_IOS_CERTS_BUCKET_ID`           | The bucket's name                        |
   | Secret   | `APP_STORE_CONNECT_API_KEY_ID`      | App Store Connect API key ID             |
   | Secret   | `APP_STORE_CONNECT_API_ISSUER_ID`   | Its issuer ID                            |
   | Secret   | `APP_STORE_CONNECT_API_KEY`         | The contents of its `.p8` file           |
   | Secret   | `GCP_IOS_CERTS_SERVICE_ACCOUNT_KEY` | Service account JSON key for the bucket  |
   | Secret   | `GCP_IOS_CERTS_ENCRYPTION_PASSWORD` | match's encryption password              |

3. Run **iOS - Release** once with **allow_provisioning_changes** ticked, so
   that match creates the app's provisioning profile and stores it in the
   bucket. Leave it unticked after that, so that a release can't change the
   signing by accident.

## Layout

```
src/games/rectangles/       the game: no Angular except board/
  generator/                puzzle generation, one file per stage
  solver/                   deduction solver (also places clues)
  state, moves, input, ...  rules and touch handling
  tutorial.ts               the interactive tutorial's steps
  board/                    the Angular board component (SVG)
  testing/                  reference puzzles recorded from the original
src/app/                    wires the game into the shared shell
games-common-core/          shared engine and shell (submodule)
tools/c-reference/          builds the original C generator to record
                            reference puzzles (needs gcc and a checkout
                            of the original collection next to this one)
android/                    Capacitor's Android project
ios/                        Capacitor's iOS project (with Apple's privacy
                            manifest, App/App/PrivacyInfo.xcprivacy)
ios/App/fastlane/           builds, signs and uploads to TestFlight; run by
                            .github/workflows/ios-release.yml
assets/app/                 icon and launch screen sources (tools/make-icon.mjs,
                            then npm run app-images for both platforms)
```

## Licence

MIT. Parts are ports of Simon Tatham's Portable Puzzle Collection; see
[LICENSE](LICENSE).
