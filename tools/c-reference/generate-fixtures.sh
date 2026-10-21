#!/bin/sh
# Builds the original C Rectangles generator and records reference puzzles
# for the TypeScript port's tests.
#
# Usage: tools/c-reference/generate-fixtures.sh [path-to-original-puzzles-repo]
# Needs: gcc, node. Default puzzles path: ../puzzles (sibling folder).

set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PUZZLES="${1:-$ROOT/../puzzles}"
BUILD="$HERE/build"
OUT="$ROOT/src/games/rectangles/testing/reference-puzzles.json"

mkdir -p "$BUILD"
gcc -O2 -std=c99 -I"$PUZZLES" -o "$BUILD/rect-reference" \
    "$HERE/rect-reference.c" \
    "$PUZZLES/rect.c" "$PUZZLES/random.c" "$PUZZLES/malloc.c" \
    "$PUZZLES/misc.c" "$PUZZLES/nullfe.c"

# Parameter sets: every preset, odd shapes, expansion factor, non-unique.
PARAMS="7x7 9x9 11x11 13x13 15x15 17x17 19x19 2x1 3x3 4x4 5x10 12x4 7x7e0.5 10x10e1 8x12e0.25 9x9a 6x6e0.3a"

# Seeds: a fixed mix of short seeds and 15-digit seeds like the app makes.
SEEDS=""
i=1
while [ $i -le 20 ]; do
    SEEDS="$SEEDS $i $((i * 7919))$((i * 104729))31337"
    i=$((i + 1))
done

TSV="$BUILD/reference.tsv"
: > "$TSV"
for p in $PARAMS; do
    "$BUILD/rect-reference" "$p" $SEEDS >> "$TSV"
done

node -e '
const fs = require("fs");
const rows = fs.readFileSync(process.argv[1], "utf8").trim().split(/\r?\n/)
  .map(l => { const [params, seed, description, solution] = l.split("\t");
              return { params, seed, description, solution }; });
fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1) + "\n");
console.log(rows.length + " reference puzzles written to " + process.argv[2]);
' "$TSV" "$OUT"
