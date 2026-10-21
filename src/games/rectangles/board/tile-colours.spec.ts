import { Rect } from '../geometry';
import { TileColours } from './tile-colours';

describe('TileColours', () => {
  const a: Rect = { x: 0, y: 0, w: 2, h: 2 };
  const b: Rect = { x: 2, y: 0, w: 1, h: 3 };
  const c: Rect = { x: 0, y: 2, w: 2, h: 1 };

  it('gives touching rectangles different colours', () => {
    const [ca, cb, cc] = new TileColours(6).coloursFor([a, b, c]);
    expect(new Set([ca, cb, cc]).size).toBe(3);
  });

  it('keeps a rectangle’s colour while it exists', () => {
    const colours = new TileColours(6);
    const [before] = colours.coloursFor([a]);
    colours.coloursFor([a, b]);
    expect(colours.coloursFor([b, a])[1]).toBe(before);
  });
});
