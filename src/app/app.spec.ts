import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
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
  });
});
