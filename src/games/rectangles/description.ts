/**
 * Text form of a puzzle, compatible with the original collection. Clues
 * are listed row by row; a letter stands for a run of empty cells
 * (a = 1 ... z = 26) and "_" separates two adjacent numbers.
 * Example: "b3_2e5" = 2 empty, 3, 2, 5 empty.
 */

export function encodeDescription(clues: ArrayLike<number>): string {
  let text = '';
  let run = 0;
  for (let i = 0; i <= clues.length; i++) {
    const n = i < clues.length ? clues[i] : -1;
    if (n === 0) {
      run++;
      continue;
    }
    if (run > 0) {
      while (run > 0) {
        const chunk = Math.min(run, 26);
        text += String.fromCharCode(96 + chunk);
        run -= chunk;
      }
    } else if (text.length > 0 && n > 0) {
      text += '_';
    }
    if (n > 0) text += String(n);
    run = 0;
  }
  return text;
}

/** Returns an error message, or null if `text` describes a grid of `area` cells. */
export function validateDescription(area: number, text: string): string | null {
  if (!/^[a-z_0-9]*$/.test(text) || /(^|[^0-9])0/.test(text)) {
    return 'Invalid character in game description';
  }
  const cells = decodeCells(text);
  if (cells.length < area) return 'Not enough data to fill grid';
  if (cells.length > area) return 'Too much data to fit in grid';
  return null;
}

/** Decodes a valid description into a clue grid (0 = no clue). */
export function decodeDescription(area: number, text: string): Int32Array {
  const error = validateDescription(area, text);
  if (error) throw new Error(error);
  return Int32Array.from(decodeCells(text));
}

function decodeCells(text: string): number[] {
  const cells: number[] = [];
  for (const [, letter, number] of text.matchAll(/([a-z])|(\d+)|_/g)) {
    if (letter) for (let i = 0; i < letter.charCodeAt(0) - 96; i++) cells.push(0);
    else if (number) cells.push(parseInt(number, 10));
  }
  return cells;
}
