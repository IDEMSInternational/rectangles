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
npm run aab            # Android release bundle for Google Play -> Rectangles.aab
```

`npm run apk` and `npm run aab` need JDK 21 (`JAVA_HOME`) and the Android SDK
(`ANDROID_HOME`, or `android/local.properties` with `sdk.dir=...`).

Google Play only accepts a bundle signed with the app's upload key, which is
never committed. `npm run aab` signs the bundle when these are set, and builds
it unsigned otherwise: `ANDROID_KEYSTORE` (path to the `.jks` file),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and, if it differs from the
keystore's, `ANDROID_KEY_PASSWORD`.

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
(which must go up with every store upload) is major × 1,000,000 + minor ×
1,000 + patch, so 1.2.3 is 1002003. `npm version` also writes the same two numbers
into the iOS project (`MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`, via
`games-common-core/ios-release/ios-version.mjs`). Each game has its own version.

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

**iOS - Release** (`.github/workflows/ios-release.yml`) runs the iOS release
shared by every IDEMS game, from games-common-core:
[games-common-core/ios-release/README.md](https://github.com/IDEMSInternational/games-common-core/blob/main/ios-release/README.md)
explains how it works and how a game is set up for it. For Rectangles that's
done: the App ID `international.idems.games.rectangles` is registered, with
its app in App Store Connect, and the IDEMS organisation's signing variables
and secrets are shared with this repository.

The App ID is set in several files;
[A game's App ID](https://github.com/IDEMSInternational/games-common-core#a-games-app-id) lists them and
explains how to change it.

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
.github/workflows/          iOS - Release, which runs the iOS release shared
                            by every game (games-common-core/ios-release/)
assets/app/                 icon and launch screen sources (tools/make-icon.mjs,
                            then npm run app-images for both platforms)
```

## Licence

MIT. Parts are ports of Simon Tatham's Portable Puzzle Collection; see
[LICENSE](LICENSE).
