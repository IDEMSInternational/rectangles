import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { hasSeenTutorial, markTutorialSeen } from '@studio/container/first-run';
import { PuzzleNotice } from '@studio/container/puzzle-notice/puzzle-notice';
import { PuzzleShell } from '@studio/container/puzzle-shell/puzzle-shell';
import { PuzzleSplash } from '@studio/container/puzzle-splash/puzzle-splash';
import { PuzzleSwitch } from '@studio/container/puzzle-switch/puzzle-switch';
import { PuzzleTutorial } from '@studio/container/puzzle-tutorial/puzzle-tutorial';
import { SessionStore } from '@studio/container/session-store';
import { storedSetting } from '@studio/container/stored-setting';
import { TutorialStore } from '@studio/container/tutorial-store';
import { RectanglesBoard } from '../games/rectangles/board/rectangles-board';
import { rectanglesGame } from '../games/rectangles/rectangles-game';
import { rectanglesTutorial } from '../games/rectangles/tutorial';

import { version } from '../../package.json';

@Component({
  selector: 'app-root',
  imports: [PuzzleNotice, PuzzleShell, PuzzleSplash, PuzzleSwitch, PuzzleTutorial, RectanglesBoard],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly game = rectanglesGame;
  protected readonly version = version;
  protected readonly session = new SessionStore(rectanglesGame);
  /** Lock: rectangles can't be drawn over existing ones. Remembered on the device. */
  protected readonly locked = storedSetting(`${rectanglesGame.id}.lock`);
  /** The tutorial in progress, if any. It runs automatically on first launch. */
  protected readonly tutorial = signal(hasSeenTutorial(rectanglesGame.id) ? null : this.newTutorial());

  protected startTutorial(): void {
    this.tutorial.set(this.newTutorial());
  }

  protected endTutorial(): void {
    markTutorialSeen(rectanglesGame.id);
    this.tutorial.set(null);
  }

  private newTutorial() {
    return new TutorialStore(rectanglesGame, rectanglesTutorial, () => this.endTutorial());
  }
}
