import { TestBed } from '@angular/core/testing';
import { LEGAL_VERSION } from '@studio/container/legal';
import { App } from './app';

/**
 * Rectangles in the shared app. The shared screens' own tests are in
 * games-common-core, beside the code in src/container, and run with these.
 */
describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    history.replaceState(null, ''); // the home page
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('renders a Rectangles board inside the puzzle shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Rectangles');
    expect(element.querySelector('rectangles-board svg')).toBeTruthy();
    expect(element.querySelectorAll('.clue').length).toBeGreaterThan(0);
    expect(element.querySelector('puzzle-splash img')?.getAttribute('src')).toBe(
      'studio/idems-games-logo.jpg',
    );
  });

  it('has the Lock switch beside Show mistakes, remembered on the device', async () => {
    localStorage.setItem('rectangles.noticeSeen', LEGAL_VERSION);
    localStorage.setItem('rectangles.tutorialSeen', '1');
    const fixture = TestBed.createComponent(App);
    const screens = (fixture.componentInstance as unknown as { screens: { openTimed(): void } })
      .screens;
    screens.openTimed();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const switches = () =>
      Array.from(element.querySelectorAll('puzzle-shell puzzle-switch input'), (i) => [
        i.parentElement!.textContent!.trim(),
        (i as HTMLInputElement).checked,
      ]);
    expect(switches()).toEqual([
      ['Lock rectangles', false],
      ['Show mistakes', false],
    ]);

    (element.querySelector('puzzle-shell puzzle-switch input') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(switches()[0]).toEqual(['Lock rectangles', true]);
    expect(localStorage.getItem('rectangles.lock')).toBe('1');
  });
});
