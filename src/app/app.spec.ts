import { TestBed } from '@angular/core/testing';
import { SessionStore } from '@studio/container/session-store';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  const sessionOf = (app: App) => (app as unknown as { session: SessionStore<unknown, unknown, unknown> }).session;

  it('renders a Rectangles board inside the puzzle shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Rectangles');
    expect(element.querySelector('rectangles-board svg')).toBeTruthy();
    expect(element.querySelectorAll('.clue').length).toBeGreaterThan(0);
  });

  it('starts in the size played last time, and remembers new choices', () => {
    localStorage.setItem('rectangles.size', '5x8');
    const session = sessionOf(TestBed.createComponent(App).componentInstance);
    expect(session.gameId()).toMatch(/^5x8#/);

    session.newGame(5); // the 9×9 preset
    expect(localStorage.getItem('rectangles.size')).toBe('9x9');
  });

  it('ignores a remembered size that is no longer valid', () => {
    localStorage.setItem('rectangles.size', '0x0');
    const session = sessionOf(TestBed.createComponent(App).componentInstance);
    expect(session.gameId()).toMatch(/^7x7#/);
  });

  it('celebrates a puzzle the player solves, but not one solved with Solve', () => {
    const session = sessionOf(TestBed.createComponent(App).componentInstance) as SessionStore<
      unknown,
      { rects: unknown[] },
      { kind: 'solve'; rects: unknown[] }
    >;

    // With the Solve button: solved, but no celebration.
    session.solve();
    expect(session.completed()).toBe(true);
    expect(session.celebrate()).toBe(false);

    // Undo, then complete the same answer as a player's move: celebration.
    const answer = session.state().rects;
    session.undo();
    session.move({ kind: 'solve', rects: answer });
    expect(session.celebrate()).toBe(true);

    // Any later action ends it.
    session.undo();
    expect(session.celebrate()).toBe(false);
  });
});
