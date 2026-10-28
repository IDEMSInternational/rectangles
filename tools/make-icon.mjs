// Draws Rectangles' app icon: a finished 3×2 rectangle with its "6" clue,
// on the board's grid, in the game's own colours.
//
// Usage: node tools/make-icon.mjs   (then: npm run app-images)
import { resolve } from 'node:path';
import { makeAppIcon } from '../games-common-core/tools/make-app-icon.mjs';

// Colours from theme.scss and rectangles-board.scss.
const BOARD = '#fffdf8';
const GRID = '#d9d3c5';
const INK = '#22252b';
const TILE = '#dcefd9';
const TILE_EDGE = '#5e9a57';
const INSET = 0.07; // as on the board

/** The icon in board units, centred on the rectangle from (0, 0) to (3, 2). */
function svg(zoomOut) {
  const half = 1.85 * zoomOut;
  const [cx, cy] = [1.5, 1];
  const grid = [];
  for (let i = -4; i <= 7; i++) {
    grid.push(`<line x1="${i}" y1="-5" x2="${i}" y2="7"/>`, `<line x1="-5" y1="${i}" x2="8" y2="${i}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cx - half} ${cy - half} ${2 * half} ${2 * half}">
  <rect x="-5" y="-5" width="13" height="12" fill="${BOARD}"/>
  <g stroke="${GRID}" stroke-width="0.025">${grid.join('')}</g>
  <rect x="${INSET}" y="${INSET}" width="${3 - 2 * INSET}" height="${2 - 2 * INSET}" rx="0.2"
    fill="${TILE}" stroke="${TILE_EDGE}" stroke-width="0.06"/>
  <text x="2.5" y="1.53" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="0.5" font-weight="650"
    text-anchor="middle" dominant-baseline="middle" fill="${INK}">6</text>
</svg>`;
}

makeAppIcon(resolve(import.meta.dirname, '..'), svg, BOARD);
