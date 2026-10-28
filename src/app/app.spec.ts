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
    expect(element.querySelector('puzzle-splash img')?.getAttribute('src')).toBe('studio/idems-games-logo.jpg');
  });

  it('has a ☰ menu with the studio pages, most "coming soon" for now', async () => {
    localStorage.setItem('rectangles.tutorialSeen', '1'); // straight to the game
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('puzzle-menu .opener') as HTMLButtonElement).click();
    await fixture.whenStable();
    const items = Array.from(element.querySelectorAll('puzzle-menu nav button'), (b) => b.textContent!.trim());
    expect(items).toEqual([
      'Announcements',
      'Acknowledgements',
      'About IDEMS Games',
      'Other IDEMS Games',
      'Licence',
      'Terms and Conditions',
    ]);

    (element.querySelectorAll('puzzle-menu nav button')[2] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('puzzle-menu h2')?.textContent).toBe('About IDEMS Games');
    expect(element.querySelector('puzzle-menu .soon')?.textContent).toContain('Coming soon');

    (element.querySelector('puzzle-menu header .icon') as HTMLButtonElement).click(); // back
    await fixture.whenStable();
    (element.querySelectorAll('puzzle-menu nav button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('puzzle-menu .page')?.textContent).toContain("Simon Tatham's Portable Puzzle Collection");
    const link = element.querySelector('puzzle-menu .link-card') as HTMLAnchorElement;
    expect(link.href).toBe('https://www.chiark.greenend.org.uk/~sgtatham/puzzles/');
    expect(link.textContent).toContain('chiark.greenend.org.uk/~sgtatham/puzzles');

    (element.querySelector('puzzle-menu header .icon') as HTMLButtonElement).click(); // back
    await fixture.whenStable();
    (element.querySelectorAll('puzzle-menu nav button')[4] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('puzzle-menu .page')?.textContent).toContain(
      'Rectangles is © 2026 IDEMS International, and it is open source.',
    );
    const repos = Array.from(element.querySelectorAll<HTMLAnchorElement>('puzzle-menu .link-card'), (a) => a.href);
    expect(repos).toEqual([
      'https://github.com/IDEMSInternational/rectangles',
      'https://github.com/IDEMSInternational/games-common-core',
    ]);
    const licence = element.querySelector('puzzle-menu .page section blockquote')?.textContent;
    expect(licence).toContain('Copyright (c) 2026 IDEMS International.');
    expect(licence).toContain(
      "Parts of this software are ports of Simon Tatham's Portable Puzzle Collection, which carries this notice:",
    );
    const inline = element.querySelector('puzzle-menu .page section blockquote a') as HTMLAnchorElement;
    expect(inline.href).toBe('https://www.chiark.greenend.org.uk/~sgtatham/puzzles/');
    expect(licence).toContain('This software is copyright (c) 2004-2024 Simon Tatham.');
    expect(licence).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
    const others = element.querySelector('puzzle-menu .page')?.textContent;
    expect(others).toContain('Angular: Copyright (c) 2010-2026 Google LLC.');
    expect(others).toContain('AndroidX libraries: The Android Open Source Project.');
    expect(others).toContain('END OF TERMS AND CONDITIONS'); // the whole Apache License

    element.querySelector('puzzle-menu .panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(element.querySelector('puzzle-menu nav')).toBeTruthy(); // back to the list
    element.querySelector('puzzle-menu .panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(element.querySelector('puzzle-menu .panel')).toBeNull(); // closed
  });

  it('starts in the size played last time, and remembers new choices', () => {
    localStorage.setItem('rectangles.size', '5x8');
    const session = sessionOf(TestBed.createComponent(App).componentInstance);
    expect(session.gameId()).toMatch(/^5x8#/);

    session.newGame(5); // the 9×9 preset
    expect(localStorage.getItem('rectangles.size')).toBe('9x9');
  });

  it('continues the game in progress after a reload, undo history included', () => {
    const first = sessionOf(TestBed.createComponent(App).componentInstance) as SessionStore<
      unknown,
      { rects: unknown[] },
      { kind: 'draw'; rect: { x: number; y: number; w: number; h: number } }
    >;
    first.move({ kind: 'draw', rect: { x: 0, y: 0, w: 2, h: 1 } });
    first.move({ kind: 'draw', rect: { x: 3, y: 3, w: 1, h: 2 } });
    first.undo();

    // "Reopen the app": a new component reads what the first one saved.
    const second = sessionOf(TestBed.createComponent(App).componentInstance) as typeof first;
    expect(second.gameId()).toBe(first.gameId());
    expect(second.state().rects).toEqual([{ x: 0, y: 0, w: 2, h: 1 }]);
    expect(second.canRedo()).toBe(true);
    second.redo();
    expect(second.state().rects.length).toBe(2);
  });

  it('forgets a finished puzzle, keeping only its size, so a reload starts a new one', () => {
    const first = sessionOf(TestBed.createComponent(App).componentInstance);
    first.newGame(1); // 5×5
    first.solve();
    expect(first.completed()).toBe(true);
    expect(localStorage.getItem('rectangles.game')).toBeNull();

    const second = sessionOf(TestBed.createComponent(App).componentInstance);
    expect(second.gameId()).toMatch(/^5x5#/);
    expect(second.gameId()).not.toBe(first.gameId());
    expect(second.completed()).toBe(false);
    expect(second.canUndo()).toBe(false);
  });

  it('starts a new puzzle if the saved game is unreadable', () => {
    localStorage.setItem('rectangles.game', '{"params":"7x7","moves":[{"kind":"nonsense"}],"position":1}');
    const session = sessionOf(TestBed.createComponent(App).componentInstance);
    expect(session.gameId()).toMatch(/^7x7#\d+$/);
    expect(session.canUndo()).toBe(false);
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
