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

Built with Angular and Capacitor (Android, and iOS later).

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

To use a newer version of the shared code:

```sh
git submodule update --remote games-common-core
npm test -- --watch=false
git commit -am "Update games-common-core"
```

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
```

## Licence

MIT. Parts are ports of Simon Tatham's Portable Puzzle Collection; see
[LICENSE](LICENSE).
